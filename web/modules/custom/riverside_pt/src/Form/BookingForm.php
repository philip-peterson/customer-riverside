<?php

namespace Drupal\riverside_pt\Form;

use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Mail\MailManagerInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\user\Entity\User;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class BookingForm extends FormBase {

  public function __construct(
    private readonly MailManagerInterface $mailManager,
    ConfigFactoryInterface $configFactory,
    RequestStack $requestStack,
  ) {
    $this->configFactory = $configFactory;
    $this->requestStack = $requestStack;
  }

  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('plugin.manager.mail'),
      $container->get('config.factory'),
      $container->get('request_stack'),
    );
  }

  public function getFormId(): string {
    return 'riverside_pt_booking_form';
  }

  public function buildForm(array $form, FormStateInterface $form_state): array {
    $query = $this->requestStack->getCurrentRequest()->query;
    $start = $query->get('start', '');
    $end   = $query->get('end', '');
    $uid   = $query->get('provider', '');

    $slot_display = '';
    if ($start && $end) {
      $s = new \DateTime($start);
      $e = new \DateTime($end);
      $slot_display = $s->format('l, F j, Y') . ', ' . $s->format('g:i A') . '–' . $e->format('g:i A');
    }

    $form['slot_summary'] = [
      '#type'   => 'item',
      '#title'  => $this->t('Appointment'),
      '#markup' => $slot_display ?: $this->t('No slot selected.'),
    ];

    if ($uid && $provider = User::load($uid)) {
      $form['provider_summary'] = [
        '#type'   => 'item',
        '#title'  => $this->t('Provider'),
        '#markup' => $provider->getDisplayName(),
      ];
    }

    $form['start']       = ['#type' => 'hidden', '#value' => $start];
    $form['end']         = ['#type' => 'hidden', '#value' => $end];
    $form['provider_id'] = ['#type' => 'hidden', '#value' => $uid];

    $form['first_name'] = [
      '#type'     => 'textfield',
      '#title'    => $this->t('First name'),
      '#required' => TRUE,
    ];

    $form['last_name'] = [
      '#type'     => 'textfield',
      '#title'    => $this->t('Last name'),
      '#required' => TRUE,
    ];

    $form['phone'] = [
      '#type'     => 'tel',
      '#title'    => $this->t('Phone number'),
      '#required' => TRUE,
    ];

    $form['actions'] = ['#type' => 'actions'];
    $form['actions']['submit'] = [
      '#type'  => 'submit',
      '#value' => $this->t('Request appointment'),
    ];

    return $form;
  }

  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $to   = $this->configFactory->get('riverside_pt.settings')->get('notification_email');
    $lang = $this->languageManager()->getDefaultLanguage()->getId();

    $params = [
      'first_name' => $form_state->getValue('first_name'),
      'last_name'  => $form_state->getValue('last_name'),
      'phone'      => $form_state->getValue('phone'),
      'start'      => $form_state->getValue('start'),
      'end'        => $form_state->getValue('end'),
    ];

    $sent = $this->mailManager->mail('riverside_pt', 'booking_request', $to, $lang, $params);

    if ($sent['result']) {
      $this->messenger()->addStatus($this->t('Your request has been submitted. We will contact you to confirm.'));
    }
    else {
      $this->messenger()->addError($this->t('Something went wrong. Please call us to book directly.'));
    }

    $form_state->setRedirect('riverside_pt.schedule');
  }

}
