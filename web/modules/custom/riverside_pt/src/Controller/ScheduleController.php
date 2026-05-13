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
      'calendar' => [
        '#type' => 'html_tag',
        '#tag' => 'div',
        '#attributes' => ['id' => 'riverside-calendar'],
      ],
      'booking_backdrop' => [
        '#type' => 'html_tag',
        '#tag' => 'div',
        '#attributes' => ['id' => 'riverside-booking-backdrop', 'hidden' => TRUE],
        '#value' => '',
      ],
      'booking_panel' => [
        '#type' => 'html_tag',
        '#tag' => 'div',
        '#attributes' => ['id' => 'riverside-booking-panel', 'hidden' => TRUE],
        'header' => [
          '#type' => 'html_tag',
          '#tag' => 'div',
          '#attributes' => ['class' => ['riverside-booking-header']],
          'title' => [
            '#type' => 'html_tag',
            '#tag' => 'span',
            '#attributes' => ['id' => 'riverside-booking-date'],
            '#value' => '',
          ],
          'close' => [
            '#type' => 'html_tag',
            '#tag' => 'button',
            '#attributes' => ['id' => 'riverside-booking-close', 'type' => 'button'],
            '#value' => $this->t('✕'),
          ],
        ],
        'slots' => [
          '#type' => 'html_tag',
          '#tag' => 'ul',
          '#attributes' => ['id' => 'riverside-booking-slots'],
          '#value' => '',
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
      'provider_id' => $data['provider_id'] ?? '',
    ]);

    return new JsonResponse(['ok' => TRUE]);
  }

  public function events(Request $request): JsonResponse {
    $start = $request->query->get('start');
    $end = $request->query->get('end');

    $current = new \DateTime($start ?? 'now');
    $today = new \DateTime('today');
    if ($current < $today) {
      $current = $today;
    }
    $until = new \DateTime($end ?? 'now');
    $events = [];
    $id = 1;

    while ($current < $until) {
      $i = (int) floor($current->getTimestamp() / 86400);
      $count = ($i % 5 + $i % 7 + $i % 11) % 6;
      for ($n = 0; $n < $count; $n++) {
        $slot = clone $current;
        $slot->setTime(9 + $n, 0);
        $events[] = [
          'id'    => $id++,
          'title' => 'Available',
          'start' => $slot->format('Y-m-d\TH:i:s'),
          'end'   => (clone $slot)->modify('+1 hour')->format('Y-m-d\TH:i:s'),
        ];
      }
      $current->modify('+1 day');
    }

    return new JsonResponse($events);
  }

}
