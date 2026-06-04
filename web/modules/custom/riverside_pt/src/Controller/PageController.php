<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;

class PageController extends ControllerBase {

  public function page(): array {
    return [
      '#theme' => 'riverside_pt_about',
      '#cache' => ['max-age' => 0],
    ];
  }

  public function contact(): array {
    return [
      '#theme' => 'riverside_pt_contact',
      '#cache' => ['max-age' => 0],
    ];
  }

  public function service($slug): array {
    $services = $this->getServices();
    $service = $services[$slug] ?? NULL;

    if (!$service) {
      throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
    }

    return [
      '#theme' => 'riverside_pt_service',
      '#slug' => $slug,
      '#title' => $service['title'],
      '#description' => $service['description'],
      '#long_description' => $service['long_description'],
      '#what_to_expect' => $service['what_to_expect'],
      '#benefits' => $service['benefits'],
      '#cache' => ['max-age' => 0],
    ];
  }

  private function getServices(): array {
    return [
      'diagnostic-assessment' => [
        'title' => 'Diagnostic Assessment',
        'description' => 'Your recovery starts with clarity. We perform a thorough evaluation of your condition, movement, and goals to create a precise, personalized treatment plan from day one.',
        'long_description' => '<p>Our comprehensive diagnostic assessment is the foundation of effective physical therapy. During this 60-minute session, our expert therapists conduct a detailed evaluation including:</p>
<ul>
<li>Medical history review</li>
<li>Physical examination of movement patterns</li>
<li>Strength and flexibility testing</li>
<li>Postural and gait analysis</li>
<li>Specialized orthopedic tests</li>
</ul>
<p>This allows us to identify the root cause of your pain or limitation, not just the symptoms.</p>',
        'what_to_expect' => '<p>You will be asked to perform various movements and exercises while we observe and measure. We may use hands-on techniques to assess joint mobility and soft tissue. Wear comfortable clothing that allows easy movement and access to the area being evaluated. The goal is to gather enough information to design a targeted treatment plan that addresses your specific needs and goals.</p>',
        'benefits' => [
          'Accurate identification of the source of your pain or dysfunction',
          'Personalized treatment plan tailored to your body and lifestyle',
          'Clear understanding of your condition and recovery timeline',
          'Baseline measurements to track progress objectively',
          'Prevention of future injuries through early detection of imbalances',
        ],
      ],
      'sports-rehabilitation' => [
        'title' => 'Sports Rehabilitation',
        'description' => 'We help athletes recover from injury and return to peak performance with targeted, sport-specific programs built around your body and your goals.',
        'long_description' => '<p>Whether you\'re a weekend warrior or a competitive athlete, our sports rehabilitation program is designed to get you back in the game safely and stronger than before. We combine evidence-based techniques with sport-specific training to address the unique demands of your activity.</p>
<p>Our therapists have experience working with athletes from a variety of sports including running, cycling, soccer, basketball, tennis, golf, and more.</p>',
        'what_to_expect' => '<p>Treatment sessions focus on restoring mobility, strength, power, and coordination specific to your sport. We incorporate functional movements, plyometrics, agility drills, and sport-specific simulations. You will receive a customized home exercise program and guidance on return-to-sport criteria and injury prevention strategies.</p>',
        'benefits' => [
          'Faster, safer return to your sport or activity',
          'Sport-specific strengthening and conditioning',
          'Improved performance and biomechanics',
          'Reduced risk of re-injury',
          'Education on proper warm-up, recovery, and training principles',
        ],
      ],
      'pre-post-surgical-rehab' => [
        'title' => 'Pre/Post-Surgical Rehab',
        'description' => 'Expert care before and after surgery to reduce recovery time, minimize complications, and restore full strength and function.',
        'long_description' => '<p>Surgery is often just one step in the recovery journey. Our pre- and post-surgical rehabilitation programs are designed to optimize outcomes and get you back to your normal activities as quickly and safely as possible.</p>
<p>Pre-hab (pre-surgery rehab) can significantly improve post-op results by strengthening supporting muscles and improving range of motion before the procedure.</p>',
        'what_to_expect' => '<p>Pre-surgery: We focus on maximizing strength, flexibility, and cardiovascular health to prepare your body for surgery and the demands of recovery. Post-surgery: We follow evidence-based protocols specific to your procedure (joint replacements, ACL reconstruction, rotator cuff repair, spinal surgery, etc.), progressing you through phases of healing while monitoring for any complications.</p>',
        'benefits' => [
          'Shorter hospital stays and faster initial recovery',
          'Reduced post-operative pain and swelling',
          'Restored range of motion and strength more quickly',
          'Lower risk of complications such as blood clots or stiffness',
          'Better long-term functional outcomes',
        ],
      ],
      'neurological-therapy' => [
        'title' => 'Neurological Therapy',
        'description' => 'Specialized therapy for nervous system conditions — helping you rebuild strength, coordination, and independence at every stage of recovery.',
        'long_description' => '<p>Neurological conditions such as stroke, Parkinson\'s disease, multiple sclerosis, traumatic brain injury, or spinal cord injury can significantly impact mobility, balance, and daily function. Our neurological physical therapy program uses specialized techniques to help you regain as much independence as possible.</p>
<p>We work closely with neurologists, occupational therapists, and other healthcare providers to create a coordinated care plan.</p>',
        'what_to_expect' => '<p>Sessions may include balance and gait training, functional electrical stimulation, task-specific training, manual therapy, and exercises to improve strength, coordination, and proprioception. We also focus on fall prevention strategies and adaptive techniques to help you safely perform daily activities.</p>',
        'benefits' => [
          'Improved balance, coordination, and walking ability',
          'Increased strength and endurance',
          'Greater independence in daily living activities',
          'Reduced fall risk',
          'Better quality of life and confidence',
        ],
      ],
    ];
  }

}
