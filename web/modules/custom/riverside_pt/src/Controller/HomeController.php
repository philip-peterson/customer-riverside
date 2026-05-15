<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;

class HomeController extends ControllerBase {

  public function page(): array {
    return [
      '#type' => 'inline_template',
      '#template' => self::template(),
      '#attached' => ['library' => ['riverside_pt/front']],
    ];
  }

  private static function template(): string {
    return <<<'TWIG'
<section class="rpt-hero">
  <div class="rpt-hero__inner">
    <h1 class="rpt-hero__heading">Heal your body</h1>
    <p class="rpt-hero__body">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
    <div class="rpt-hero__actions">
      <a href="/schedule" class="rpt-btn rpt-btn--primary">Book an Appointment</a>
      <a href="/services" class="rpt-btn rpt-btn--secondary">View Our Services</a>
    </div>
  </div>
</section>

<section class="rpt-services">
  <div class="rpt-services__header">
    <h2 class="rpt-services__heading">Bringing Relief</h2>
    <p class="rpt-services__subtitle">Our wide range of services</p>
  </div>
  <div class="rpt-services__grid">
    <div class="rpt-service-card">
      <h3 class="rpt-service-card__title">Diagnostic Evaluation</h3>
      <p class="rpt-service-card__body">Comprehensive assessment to identify the root cause of your pain and build a personalized recovery plan.</p>
      <a href="/services" class="rpt-btn rpt-btn--outline">More Info</a>
    </div>
    <div class="rpt-service-card">
      <h3 class="rpt-service-card__title">Sports Rehabilitation</h3>
      <p class="rpt-service-card__body">Targeted programs to help athletes recover from injury and return to peak performance safely.</p>
      <a href="/services" class="rpt-btn rpt-btn--outline">More Info</a>
    </div>
    <div class="rpt-service-card">
      <h3 class="rpt-service-card__title">Pre/Post-Surgical Rehab</h3>
      <p class="rpt-service-card__body">Expert care before and after surgery to maximize recovery outcomes and restore full function.</p>
      <a href="/services" class="rpt-btn rpt-btn--outline">More Info</a>
    </div>
    <div class="rpt-service-card">
      <h3 class="rpt-service-card__title">Neurological Physical Therapy</h3>
      <p class="rpt-service-card__body">Specialized therapy for nervous system conditions, helping you regain strength and independence.</p>
      <a href="/services" class="rpt-btn rpt-btn--outline">More Info</a>
    </div>
  </div>
</section>
TWIG;
  }

}
