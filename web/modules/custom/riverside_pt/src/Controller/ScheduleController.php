<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\TempStore\PrivateTempStore;
use Drupal\Core\TempStore\PrivateTempStoreFactory;
use Drupal\Core\Url;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class ScheduleController extends ControllerBase {

  private PrivateTempStore $tempStore;

  public function __construct(PrivateTempStoreFactory $tempStoreFactory) {
    $this->tempStore = $tempStoreFactory->get('riverside_pt');
  }

  public static function create(ContainerInterface $container): static {
    return new static($container->get('tempstore.private'));
  }

  public function page(): array {
    return [
      '#type' => 'container',
      'intro' => [
        '#type' => 'html_tag',
        '#tag' => 'p',
        '#value' => $this->t('View provider availability below. Use the calendar to browse open appointment slots by week.'),
      ],
      'booking_wrap' => [
        '#type' => 'html_tag',
        '#tag' => 'div',
        '#attributes' => ['class' => ['riverside-booking-wrap']],
        'calendar' => [
          '#type' => 'html_tag',
          '#tag' => 'div',
          '#attributes' => ['id' => 'riverside-calendar'],
          '#value' => '',
        ],
        'slots_wrap' => [
          '#type' => 'html_tag',
          '#tag' => 'div',
          '#attributes' => ['id' => 'riverside-slots-wrap', 'hidden' => TRUE],
          'slots' => [
            '#type' => 'html_tag',
            '#tag' => 'div',
            '#attributes' => ['id' => 'riverside-booking-slots'],
            '#value' => '',
          ],
        ],
      ],
      '#attached' => [
        'library' => ['riverside_pt/schedule'],
        'drupalSettings' => [
          'riversidePt' => [
            'eventsUrl'    => Url::fromRoute('riverside_pt.schedule_events')->toString(),
            'bookingUrl'   => Url::fromRoute('riverside_pt.booking')->toString(),
            'storeSlotUrl' => Url::fromRoute('riverside_pt.booking_store_slot')->toString(),
            'holidays'     => $this->buildHolidaysMap(),
          ],
        ],
      ],
    ];
  }

  private function buildHolidaysMap(): array {
    $holidays = $this->config('riverside_pt.settings')->get('holidays') ?? [];
    $map = [];
    foreach ($holidays as $holiday) {
      $map[$holiday['date']] = $holiday['name'];
    }
    return $map;
  }

  public function storeSlot(Request $request): JsonResponse {
    $data  = json_decode($request->getContent(), TRUE) ?? [];
    $start = $data['start'] ?? '';

    if (!$start || new \DateTime($start) < new \DateTime()) {
      return new JsonResponse(['error' => 'past'], 422);
    }

    $this->tempStore->set('booking_slot', [
      'start'       => $start,
      'end'         => $data['end'] ?? '',
      'service'     => $data['service'] ?? 'diagnostic',
      'last_name'   => $data['lastName'] ?? '',
      'phone'       => $data['phone'] ?? '',
      'comments'    => $data['comments'] ?? '',
      'provider_id' => $data['provider_id'] ?? '',
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
