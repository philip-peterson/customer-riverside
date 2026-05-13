<?php

namespace Drupal\riverside_pt\Form;

use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Mail\MailManagerInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\TempStore\PrivateTempStore;
use Drupal\Core\TempStore\PrivateTempStoreFactory;
use Drupal\user\Entity\User;
use Symfony\Component\DependencyInjection\ContainerInterface;

class BookingForm extends FormBase {

  private PrivateTempStore $tempStore;

  public function __construct(
    private readonly MailManagerInterface $mailManager,
    ConfigFactoryInterface $configFactory,
    PrivateTempStoreFactory $tempStoreFactory,
  ) {
    $this->configFactory = $configFactory;
    $this->tempStore = $tempStoreFactory->get('riverside_pt');
  }

  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('plugin.manager.mail'),
      $container->get('config.factory'),
      $container->get('tempstore.private'),
    );
  }

  public function getFormId(): string {
    return 'riverside_pt_booking_form';
  }

  public function buildForm(array $form, FormStateInterface $form_state): array {
    $slot  = $this->tempStore->get('booking_slot') ?? [];
    $start = $slot['start'] ?? '';
    $end   = $slot['end'] ?? '';
    $uid   = $slot['provider_id'] ?? '';

    $slot_display = '';
    if ($start && $end) {
      $s = new \DateTime($start);
      $e = new \DateTime($end);
      $slot_display = $s->format('l, F j, Y') . ', ' . $s->format('g:i A') . '–' . $e->format('g:i A');
    }

    $form['#cache'] = ['max-age' => 0];

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

    $form['comments'] = [
      '#type'  => 'textarea',
      '#title' => $this->t('Comments'),
      '#rows'  => 4,
    ];

    $form['actions'] = ['#type' => 'actions'];
    $form['actions']['submit'] = [
      '#type'  => 'submit',
      '#value' => $this->t('Request appointment'),
    ];

    return $form;
  }

  public function validateForm(array &$form, FormStateInterface $form_state): void {
    $slot  = $this->tempStore->get('booking_slot') ?? [];
    $start = $slot['start'] ?? '';

    if (!$start) {
      $form_state->setError($form['slot_summary'], $this->t('No slot selected. Please go back and choose a time.'));
      return;
    }

    if (new \DateTime($start) < new \DateTime()) {
      $form_state->setError($form['slot_summary'], $this->t('That slot is in the past. Please go back and choose another time.'));
      return;
    }

    $provider_id = $slot['provider_id'] ?? '';
    $conflict = \Drupal::entityQuery('node')
      ->condition('type', 'appointment')
      ->condition('field_appointment_date', $start)
      ->condition('field_provider', $provider_id ?: 0)
      ->accessCheck(FALSE)
      ->count()
      ->execute();

    if ($conflict > 0) {
      $form_state->setError($form['slot_summary'], $this->t('That slot was just booked. Please go back and choose another time.'));
    }
  }

  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $slot = $this->tempStore->get('booking_slot') ?? [];
    $this->tempStore->delete('booking_slot');

    $to   = $this->configFactory->get('riverside_pt.settings')->get('notification_email');
    $lang = $this->languageManager()->getDefaultLanguage()->getId();

    $sent = $this->mailManager->mail('riverside_pt', 'booking_request', $to, $lang, [
      'first_name' => $form_state->getValue('first_name'),
      'last_name'  => $form_state->getValue('last_name'),
      'phone'      => $form_state->getValue('phone'),
      'comments'   => $form_state->getValue('comments'),
      'start'      => $slot['start'] ?? '',
      'end'        => $slot['end'] ?? '',
    ]);

    if ($sent['result']) {
      $this->messenger()->addStatus($this->t('Your request has been submitted. We will contact you to confirm.'));
    }
    else {
      $this->messenger()->addError($this->t('Something went wrong. Please call us to book directly.'));
    }

    $form_state->setRedirect('riverside_pt.schedule');
  }

}
