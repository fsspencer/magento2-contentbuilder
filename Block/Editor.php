<?php
/**
 * @category    Codealist
 * @package     ContentBuilder
 * @copyright   Copyright (c) 2018 Codealist
 */

namespace Codealist\ContentBuilder\Block;

class Editor extends \Magento\Backend\Block\Template {

    /**
     * @var \Magento\Widget\Model\WidgetFactory
     */
    protected $widgetFactory;

    /**
     * @var \Magento\Framework\Json\Helper\Data
     */
    protected $jsonHelper;

    /**
     * Editor constructor.
     * @param \Magento\Backend\Block\Template\Context $context
     * @param \Magento\Widget\Model\WidgetFactory $widgetFactory
     * @param \Magento\Framework\Json\Helper\Data $jsonHelper
     * @param array $data
     */
    public function __construct(
        \Magento\Backend\Block\Template\Context $context,
        \Magento\Widget\Model\WidgetFactory $widgetFactory,
        \Magento\Framework\Json\Helper\Data $jsonHelper,
        array $data = [])
    {
        $this->widgetFactory = $widgetFactory;
        $this->jsonHelper = $jsonHelper;
        parent::__construct($context, $data);
    }

    /**
     * Returns an array of widget names associated with widget types
     *
     * @return string
     */
    public function getWidgetNames() {
        /**
         * @var $widget \Magento\Widget\Model\Widget
         */
        $widget = $this->widgetFactory->create();
        $widgetArray = $widget->getWidgetsArray();
        $nameArray = [];

        foreach ($widgetArray as $obj) {
            $nameArray[$obj['type']] = $obj['name']->getText();
        }

        return (!empty($nameArray)) ? $this->jsonHelper->jsonEncode($nameArray) : '{}';
    }
}