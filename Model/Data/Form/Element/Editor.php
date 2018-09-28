<?php
/**
 * @category    Codealist
 * @package     ContentBuilder
 * @copyright   Copyright (c) 2018 Codealist
 */

namespace Codealist\ContentBuilder\Model\Data\Form\Element;

use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Data\Form\Element\CollectionFactory;
use Magento\Framework\Data\Form\Element\Editor as FrameworkEditor;
use Magento\Framework\Data\Form\Element\Factory;
use Magento\Framework\Escaper;
use Magento\Framework\UrlInterface;

class Editor extends FrameworkEditor
{
    /**
     * Elements Editor enabled config path
     */
    const ELEMENT_EDITOR_ENABLED_CONFIG_PATH = 'codealist_contentbuilder/general/active';

    /**
     * @var ScopeConfigInterface
     */
    protected $scopeConfig;

    /**
     * @var UrlInterface
     */
    protected $urlInterface;

    /**
     * @param ScopeConfigInterface $scopeConfig
     * @param Factory $factoryElement
     * @param CollectionFactory $factoryCollection
     * @param Escaper $escaper
     * @param UrlInterface $urlInterface
     * @param array $data
     */
    public function __construct(
        ScopeConfigInterface $scopeConfig,
        Factory $factoryElement,
        CollectionFactory $factoryCollection,
        Escaper $escaper,
        UrlInterface $urlInterface,
        $data = []
    ) {
        $this->scopeConfig = $scopeConfig;
        $this->urlInterface = $urlInterface;
        parent::__construct($factoryElement, $factoryCollection, $escaper, $data);
    }

    /**
     * Disables built-in wysiwyg editor on current form if elements is supported and enabled
     *
     * @return string
     */
    public function getElementHtml()
    {
        $wysiwyg = $this->getWysiwyg();

        if ($this->isElementsEditorSupported()) {
            $this->setWysiwyg(false);
        }
        $html = parent::getElementHtml();
        $this->setWysiwyg($wysiwyg);

        return $html;
    }

    /**
     * {@inheritdoc}
     */
    protected function _getButtonsHtml()
    {
        if ($this->isElementsEditorSupported()) {
            $buttonsHtml = '<div id="buttons' . $this->getHtmlId() . '" class="buttons-set">';
            $buttonsHtml .= $this->_getElementsEditorToggleButtonHtml();
            $buttonsHtml .= $this->_getPluginButtonsHtml();
            $buttonsHtml .= '</div>';
            return $buttonsHtml;
        }
        return parent::_getButtonsHtml();
    }

    /**
     * Return HTML button for toggling Elements Editor
     *
     * @param bool $visible
     * @return string
     */
    protected function _getElementsEditorToggleButtonHtml($visible = true)
    {
        $html = $this->_getButtonHtml([
            'title' => $this->translate('Show Elements Editor'),
            'class' => 'action-show-elements-editor',
            'style' => $visible ? '' : 'display:none',
            'id' => 'toggle_elements_editor',
            'onclick' => 'ElementsEditorUtility.openEditor(\'#' . $this->getHtmlId() . '\')'
        ]);
        return $html;
    }

    /**
     * Returns true if Elements editor is supported by current form
     *
     * @return bool
     */
    protected function isElementsEditorSupported()
    {
        return in_array($this->getHtmlId(), [
            'page_content',     // v2.0 layout handle
            'block_content',    // v2.0 layout handle
            'cms_page_form_content',
            'cms_block_form_content',
            'cmsstaging_page_update_form_content',
        ]) && $this->isElementsEditorEnabled();
    }

    /**
     * Retrieves enabled status of elements editor
     *
     * @return bool
     */
    protected function isElementsEditorEnabled()
    {
        return (bool)$this->scopeConfig->getValue(self::ELEMENT_EDITOR_ENABLED_CONFIG_PATH);
    }
}
