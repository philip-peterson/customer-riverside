<?php

namespace Drupal\riverside_pt\Controller;

use Drupal\Core\Controller\ControllerBase;

class PaletteController extends ControllerBase {

  public function page(): array {
    $colors = $this->parseColors();

    if (!$colors) {
      return ['#markup' => \Drupal\Core\Render\Markup::create('<p>Could not parse tailwind.config.js</p>')];
    }

    $html = '<div style="font-family:monospace;font-size:13px;padding:32px;background:#f5f5f5">';

    foreach ($colors as $group => $shades) {
      $html .= '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#666;margin:28px 0 12px">'
        . htmlspecialchars($group) . '</div>';

      $html .= '<div style="display:flex;flex-wrap:wrap;gap:12px">';
      foreach ($shades as $shade => $hex) {
        $label = $shade === 'DEFAULT' ? $group : "$group-$shade";
        $border = $this->luminance($hex) > 200 ? 'border:1px solid #ddd;' : '';

        $html .= '<div style="width:100px">'
          . "<div style=\"width:100px;height:64px;background:{$hex};border-radius:6px 6px 0 0;{$border}\"></div>"
          . '<div style="background:#fff;border:1px solid #ddd;border-top:none;border-radius:0 0 6px 6px;padding:6px 8px">'
          . '<div style="font-weight:600;color:#333">' . htmlspecialchars($label) . '</div>'
          . '<div style="color:#888;font-size:11px">' . htmlspecialchars($hex) . '</div>'
          . '</div>'
          . '</div>';
      }
      $html .= '</div>';
    }

    $html .= '</div>';

    return ['#markup' => \Drupal\Core\Render\Markup::create($html)];
  }

  private function parseColors(): array {
    $path = dirname(DRUPAL_ROOT) . '/tailwind.config.js';
    if (!file_exists($path)) {
      return [];
    }
    $content = file_get_contents($path);

    // Find the opening of the colors: { block
    if (!preg_match('/colors\s*:\s*\{/', $content, $m, PREG_OFFSET_CAPTURE)) {
      return [];
    }
    $start = $m[0][1] + strlen($m[0][0]);

    // Walk forward counting braces to find the closing }
    $depth = 1;
    $i = $start;
    $len = strlen($content);
    while ($i < $len && $depth > 0) {
      if ($content[$i] === '{') $depth++;
      elseif ($content[$i] === '}') $depth--;
      $i++;
    }
    $block = substr($content, $start, $i - $start - 1);

    $colors = [];

    // 'group': { shade: '#hex', ... }
    preg_match_all("/'([^']+)'\s*:\s*\{([^}]+)\}/", $block, $groups, PREG_SET_ORDER);
    foreach ($groups as $group) {
      $name = $group[1];
      preg_match_all('/(\w+)\s*:\s*\'(#[0-9a-fA-F]{3,6})\'/', $group[2], $shades, PREG_SET_ORDER);
      foreach ($shades as $shade) {
        $colors[$name][$shade[1]] = $shade[2];
      }
    }

    // 'group': '#hex'  (flat single-value entry)
    preg_match_all("/'([^']+)'\s*:\s*'(#[0-9a-fA-F]{3,6})'/", $block, $singles, PREG_SET_ORDER);
    foreach ($singles as $single) {
      if (!isset($colors[$single[1]])) {
        $colors[$single[1]]['DEFAULT'] = $single[2];
      }
    }

    return $colors;
  }

  private function luminance(string $hex): int {
    $hex = ltrim($hex, '#');
    return (int) (
      0.299 * hexdec(substr($hex, 0, 2)) +
      0.587 * hexdec(substr($hex, 2, 2)) +
      0.114 * hexdec(substr($hex, 4, 2))
    );
  }

}
