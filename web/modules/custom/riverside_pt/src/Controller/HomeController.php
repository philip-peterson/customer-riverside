<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;

class HomeController extends ControllerBase {

  public function page(): array {
    $holidays = $this->config('riverside_pt.settings')->get('holidays') ?? [];
    $holidayMap = [];
    foreach ($holidays as $h) {
      $holidayMap[$h['date']] = $h['name'];
    }

    return [
      '#theme' => 'riverside_pt_home',
      '#attached' => [
        'library' => ['riverside_pt/schedule'],
        'drupalSettings' => [
          'riversidePt' => [
            'eventsUrl'    => Url::fromRoute('riverside_pt.schedule_events')->toString(),
            'bookingUrl'   => Url::fromRoute('riverside_pt.booking')->toString(),
            'storeSlotUrl' => Url::fromRoute('riverside_pt.booking_store_slot')->toString(),
            'holidays'     => $holidayMap,
          ],
        ],
      ],
    ];
  }

}
