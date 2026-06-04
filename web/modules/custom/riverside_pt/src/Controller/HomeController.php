<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Url;
use Symfony\Component\HttpFoundation\Request;

class HomeController extends ControllerBase {

  // Renders the home page at a clean URL (e.g. /services, /book-appointment)
  // and injects the scroll target so the client scrolls to the right section
  // without a redirect — the URL stays exactly as requested.
  public function redirectToAnchor(Request $request): array {
    $build = $this->page();
    $destination = $request->attributes->get('destination', '');
    $hash = strstr($destination, '#');
    if ($hash !== FALSE) {
      $build['#attached']['drupalSettings']['riversidePt']['scrollTo'] = $hash;
    }
    return $build;
  }

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
            'storeSlotUrl' => Url::fromRoute('riverside_pt.booking_store_slot')->toString(),
            'holidays'     => $holidayMap,
          ],
        ],
      ],
    ];
  }

}
