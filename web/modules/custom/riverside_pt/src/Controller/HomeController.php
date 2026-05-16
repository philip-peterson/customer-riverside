<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;

class HomeController extends ControllerBase {

  public function page(): array {
    return ['#theme' => 'riverside_pt_home'];
  }

}
