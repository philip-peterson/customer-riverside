<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\TempStore\PrivateTempStore;
use Drupal\Core\TempStore\PrivateTempStoreFactory;
use Drupal\Core\Mail\MailManagerInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ScheduleController extends ControllerBase {

  private PrivateTempStore $tempStore;

  public function __construct(
    PrivateTempStoreFactory $tempStoreFactory,
    private readonly MailManagerInterface $mailManager,
    ConfigFactoryInterface $configFactory,
  ) {
    $this->tempStore = $tempStoreFactory->get('riverside_pt');
    $this->configFactory = $configFactory;
  }

  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('tempstore.private'),
      $container->get('plugin.manager.mail'),
      $container->get('config.factory'),
    );
  }

  public function storeSlot(Request $request): JsonResponse {
    $data  = json_decode($request->getContent(), TRUE) ?? [];
    $start = $data['start'] ?? '';

    if (!$start || new \DateTime($start) < new \DateTime()) {
      return new JsonResponse(['error' => 'past'], 422);
    }

    $firstName  = trim($data['firstName'] ?? $data['first_name'] ?? '');
    $lastName   = trim($data['lastName'] ?? $data['last_name'] ?? '');
    $phone      = trim($data['phone'] ?? '');
    $comments   = $data['comments'] ?? '';
    $service    = $data['service'] ?? 'diagnostic';
    $end        = $data['end'] ?? '';
    $providerId = $data['provider_id'] ?? '';

    // Full contact info present (new embedded booking flow on homepage):
    // validate, send the request email immediately, and return success.
    // This replaces the previous /schedule/book form page.
    if ($firstName && $lastName && $phone) {
      // Prevent double-booking against existing appointment nodes (same logic as before).
      $conflict = \Drupal::entityQuery('node')
        ->condition('type', 'appointment')
        ->condition('field_appointment_date', $start)
        ->condition('field_provider', $providerId ?: 0)
        ->accessCheck(FALSE)
        ->count()
        ->execute();

      if ($conflict > 0) {
        return new JsonResponse(['error' => 'conflict'], 422);
      }

      $to   = $this->configFactory->get('riverside_pt.settings')->get('notification_email');
      $lang = \Drupal::languageManager()->getDefaultLanguage()->getId();

      $sent = $this->mailManager->mail('riverside_pt', 'booking_request', $to, $lang, [
        'first_name' => $firstName,
        'last_name'  => $lastName,
        'phone'      => $phone,
        'comments'   => $comments,
        'start'      => $start,
        'end'        => $end,
      ]);

      $this->tempStore->delete('booking_slot');

      if ($sent['result']) {
        return new JsonResponse(['ok' => TRUE]);
      }
      return new JsonResponse(['error' => 'mail_failed'], 500);
    }

    // Legacy/minimal path (no contact details): just stash in tempstore (for any
    // remaining callers that don't send full info).
    $this->tempStore->set('booking_slot', [
      'start'       => $start,
      'end'         => $end,
      'service'     => $service,
      'last_name'   => $lastName,
      'phone'       => $phone,
      'comments'    => $comments,
      'provider_id' => $providerId,
    ]);

    return new JsonResponse(['ok' => TRUE]);
  }

  public function events(Request $request): JsonResponse {
    $start = $request->query->get('start');
    $end = $request->query->get('end');
    $service = $request->query->get('service', 'diagnostic');

    $faultZeroAvailability = [
      'diagnostic' => false,
      'sports'     => false,
      'surgical'   => false,
      'neuro'      => false,
    ];
    if ($faultZeroAvailability[$service] ?? false) {
      return new JsonResponse([]);
    }

    // Each service gets different slot density and start hours so calendars
    // look meaningfully distinct when switching types.
    $serviceConfig = [
      'diagnostic' => ['seeds' => [5, 7, 11], 'startHour' => 9],
      'sports'     => ['seeds' => [3, 5, 8],  'startHour' => 7],
      'surgical'   => ['seeds' => [4, 6, 13], 'startHour' => 10],
      'neuro'      => ['seeds' => [2, 9, 7],  'startHour' => 11],
    ];
    $cfg = $serviceConfig[$service] ?? $serviceConfig['diagnostic'];
    [$s0, $s1, $s2] = $cfg['seeds'];

    $current = new \DateTime($start ?? 'now');
    $earliest = new \DateTime('tomorrow');
    if ($service === 'surgical') {
      $earliest = new \DateTime('+46 days');
    }
    if ($current < $earliest) {
      $current = $earliest;
    }
    $until = new \DateTime($end ?? 'now');
    $events = [];
    $id = 1;

    while ($current < $until) {
      $dow = (int) $current->format('N'); // 1=Mon … 7=Sun
      if ($dow <= 5) {
        $i = (int) floor($current->getTimestamp() / 86400);
        $count = ($i % $s0 + $i % $s1 + $i % $s2) % 6;
        for ($n = 0; $n < $count; $n++) {
          $slot = clone $current;
          $slot->setTime($cfg['startHour'] + $n, 0);
          $events[] = [
            'id'    => $id++,
            'title' => 'Available',
            'start' => $slot->format('Y-m-d\TH:i:s'),
            'end'   => (clone $slot)->modify('+1 hour')->format('Y-m-d\TH:i:s'),
          ];
        }
      }
      $current->modify('+1 day');
    }

    return new JsonResponse($events);
  }

}
