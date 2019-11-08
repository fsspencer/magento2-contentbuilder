/**
 * @category    Codealist
 * @package     Elements
 * @copyright   Copyright (c) 2018 Codealist
 */

define([
    'jquery',
    'underscore',
    'jquery/jstree/jquery.hotkeys',     // need this to load before we execute fix for jstree hotkeys
    'Magento_Ui/js/modal/modal',
    'Codealist_ContentBuilder/lib/contentbuilder/contentbuilder-src',
    'Codealist_ContentBuilder/js/contentbuilder-overrides'
], function ($, _) {
    'use strict';


    var ElementsEditorUtility = {
        editorElement: null,

        init: function (element) {
            this.editorElement = element;
        },

        openEditor: function (targetId) {
            if (this.editorElement.editor) {
                this.editorElement.editor('setEditorTargetSelector', targetId);
                this.editorElement.editor('openModal');
            }
        }
    };
    window.ElementsEditorUtility = ElementsEditorUtility;

    $.widget('Codealist_ContentBuilder.editor', $.mage.modal, {
        width: '100%',
        options: {
            title: $.mage.__('Elements Editor'),
            modalClass: 'elements-editor-modal',
            buttons: [{
                text: $.mage.__('Cancel'),
                class: 'action secondary action-dismiss',
                click: function() {
                    this.closeModal();
                }
            },{
                text: $.mage.__('Apply'),
                class: 'action primary action-hide-popup',
                click: function () {
                    this._updateEditorMarkup();
                    this.closeModal();
                }
            }],
            targetSelector: null,
            contentSelector: '#elements_editor_content',
            directiveUrl: null,
            filesBrowserUrl: null,
            filesBrowserTarget: 'elements_editor_content',
            snippetFile: require.toUrl('Codealist_ContentBuilder/lib/contentbuilder/assets/snippets.html'),
            snippetAssetUrl: require.toUrl('Codealist_ContentBuilder/lib/contentbuilder/assets/images'),
            snippetAssetBase: 'Codealist_ContentBuilder/lib/contentbuilder/assets/images',
            snippetCategories: [
                //[0, "Default"],
                [-1, "Show All"],
                [1, "Title"],
                [2, "Title, Subtitle"],
                [3, "Info, Title"],
                [4, "Info, Title, Subtitle"],
                [5, "Heading, Paragraph"],
                [6, "Paragraph"],
                [7, "Paragraph, Images + Caption"],
                [8, "Heading, Paragraph, Images + Caption"],
                [9, "Images + Caption"],
                [10, "Images + Long Caption"],
                [11, "Images"],
                [12, "Single Image"],
                [13, "Call to Action"],
                [14, "List"],
                [15, "Quotes"],
                [16, "Profile"],
                [17, "Map"],
                [20, "Video"],
                [18, "Social"],
                [19, "Separator"],
                [20, "Video Extras"],
                [21, "Our Services"],
                [22, "Contact Us"],
                [23, "Pricing"],
                [24, "Team Pages"],
                [25, "Portfolio"],
                [26, "How Things Work"],
                [27, "Partners and Clients"],
                [28, "As Featured / Seen On"],
                [29, "Achievements"],
                [30, "Under Construction"],
                [31, "404 Not Found"],
                [32, "Expertise / Skills"]
            ],

            keyEventHandlers: {
                escapeKey: function () {
                    // do nothing; kills the escape key closes modal syndrome which causes unexpected closure of modal
                }
            },

            widgetNames: null,

            placeholderUrl: null
        },
        cssHookPositionFixedElements: [   // anything added here must be added to position:fixed group in stylesheet
            'divToolImg',
            'divToolImgSettings',
            'divFrameLink',
            'divRteLink'
        ],
        superHooks: {
            css: {
                top: $.cssHooks.top || {},
                left: $.cssHooks.left || {}
            },
            val: {
                input: $.valHooks.input || {}
            }
        },

        _create: function () {
            this._super();

            _.bindAll(
                this,
                '_onContentBuilderRender',
                '_onFilesBrowserInsert',
                '_openFilesBrowser',
                '_getValHookEncodeDirective',
                '_setValHookDecodeDirective',
                '_setCssHookTop',
                '_setCssHookLeft'
            );

            // initialize css hooks
            if (!$.cssHooks.top) {
                $.cssHooks.top = {};
            }
            $.cssHooks.top.set = this._setCssHookTop;

            if (!$.cssHooks.left) {
                $.cssHooks.left = {};
            }
            $.cssHooks.left.set = this._setCssHookLeft;

            // setup value setter injection
            $.valHooks.input = {
                get: this._getValHookEncodeDirective,
                set: this._setValHookDecodeDirective
            };

            // init the content builder widget
            this._getElem(this.options.contentSelector).contentbuilder({
                onImageBrowseClick: this._openFilesBrowser,
                onRender: this._onContentBuilderRender,
                enableZoom: false,
                snippetOpen: true,
                snippetCategories: this.options.snippetCategories,
                fontSizesPath: require.toUrl('Codealist_ContentBuilder/js/templates/fontsize.html'),
                fontsFile: require.toUrl('Codealist_ContentBuilder/js/templates/fonts.html'),
                headingsFile: require.toUrl('Codealist_ContentBuilder/js/templates/headings.html'),
                iconselect: require.toUrl('Codealist_ContentBuilder/lib/contentbuilder/assets/ionicons/selecticon.html')
            });

            // don't allow popup markup editor because it complicates living atop a text based editor
            $('#rte-toolbar').find('a[data-rte-cmd="html"]').remove();

            // listen to image change event from file / media browser
            $('#' + this.options.filesBrowserTarget).on('change', this._onFilesBrowserInsert);

            // load snippets and parse after load
            $.get(this.options.snippetFile, _.bind(function (response) {
                if (response.error) {
                    alert(response.message);
                    return;
                }
                this._processSnippetFile(response);
                this._initSnippetFilter();
                this._applyDraggable();
            }, this));

            // init the editor utility
            ElementsEditorUtility.init(this.element);
        },

        openModal: function () {
            this._updateContentBuilder(this._getEditorHtml());
            this._super();
        },

        closeModal: function () {
            this._updateContentBuilder('');
            this._super();
        },

        isOpen: function () {
            return this.options.isOpen;
        },

        _onContentBuilderRender: function () {
            $('#rte-toolbar').find('a[data-rte-cmd]').each(_.bind(function (index, element) {
                // The use of a private jQuery API here is intentional, as it is the only way to circumvent the
                // anon functions the contentbuilder uses for the #rte-toolbar without editing the library directly
                if ($._data(element, 'events') && $._data(element, 'events').click.length > 0) {
                    var handler = $._data(element, 'events').click[0].handler;
                    $(element).unbind('click', handler);

                    handler = _.wrap(handler, function(func, e) {
                        var sel = getSelected();
                        if (sel && $(sel.anchorNode).parents('#elements_editor_content').length > 0) {
                            return func(e); // call through to the click handler, only if selection is in editor
                        } else {
                            alert('Please select something to edit.');
                        }
                    });
                    $(element).click(handler);
                }
            }, this));
        },

        _openFilesBrowser: function () {
            MediabrowserUtility.openDialog(
                this.options.filesBrowserUrl + "target_element_id/" + this.options.filesBrowserTarget + "/",
                null, null, null, {}
            );
        },

        _onFilesBrowserInsert: function (data) {
            $('#divToolImg').data('image').attr('src', data.target.value);
        },

        _getContentBuilder: function() {
            return this._getElem(this.options.contentSelector).data('contentbuilder');
        },

        _encodeWidgetPlaceholder: function(markup) {
            var widgetRegex = /\{\{widget(\s+[a-zA-Z0-9_-]+="[^"]+")+\s*}}/g;
            var results = markup.match(widgetRegex);
            var widgetNames = this.options.widgetNames;
            var type, typeArray;

            if(results){
                for (var i = 0; i < results.length; i++){
                    typeArray = results[i].match(/type="([^"]*)/);
                    type = typeArray[1];
                    markup = markup.substr(0, markup.indexOf(results[i])) +
                        '<div class="tempWidget" data-mode="readonly">' + '<!-- ' + results[i] + ' -->' +
                        '<p><img src="' + this.options.placeholderUrl + '" height="20px"> ' + widgetNames[type] + ' Widget</p></div>' +
                        markup.substr(markup.indexOf(results[i]) - 1 + results[i].length + 1);
                }
            }


            return markup;
        },

        _decodeWidgetPlaceholder: function(markup) {
            var tempRegex = /<div class="tempWidget".*?<\/p><\/div>/g;
            var widgetRegex = /\{\{widget(\s+[a-zA-Z0-9_-]+="[^"]+")+\s*}}/g;
            var tempResults = markup.match(tempRegex);

            if(tempResults){
                for (var k = 0; k < tempResults.length; k++){
                    markup = markup.substr(0, markup.indexOf(tempResults[k])) + tempResults[k].match(widgetRegex)[0] +
                        markup.substr(markup.indexOf(tempResults[k]) + tempResults[k].length);
                }
            }

            return markup;
        },

        _updateContentBuilder: function(markup) {
            markup = this._encodeDirectives(markup);
            markup = this._encodeWidgetPlaceholder(markup);
            markup = this._repairContent(markup);
            this._getContentBuilder().loadHTML(markup);
        },

        setEditorTargetSelector: function (selector) {
            this.options.targetSelector = selector;
        },

        /**
         * Replace markup into HTML editor form field
         *
         * @param html
         * @private
         */
        _setEditorHtml: function (html) {
            $(this.options.targetSelector).val(html).change();
        },

        /**
         * Retrieve markup from HTML editor form field
         *
         * @returns {string}
         * @private
         */
        _getEditorHtml: function () {
            return $(this.options.targetSelector).val();
        },

        /**
         * Updates HTML editor form field with markup from the cotent builder
         * @private
         */
        _updateEditorMarkup: function () {
            var markup = this._getContentBuilder().html();
            markup = this._decodeWidgetPlaceholder(markup);
            markup = this._decodeDirectives(markup);
            this._setEditorHtml(markup);
        },

        _processSnippetFile: function (data) {

            // translate urls in snippets to view directives and use data-src to prevent img auto-loading attempts
            data = data.replace(/<img src="assets\/minimalist(?:-basic)?\/(.*?)"(.*?)>/ig, function (match, $1, $2) {
                return '<img data-src="{{view url="' + this.options.snippetAssetBase + '/' + $1 + '"}}"' + $2 + '>';
            }.bind(this));
            data = this._encodeDirectives(data);

            // translate URLs to load from materialized asset location
            data = data.replace(/assets\/minimalist(?:-basic)?/ig, this.options.snippetAssetUrl);

            // load in and prepare snippets
            var htmlData = '';
            var htmlThumbs = '';

            $('<div/>').html(data).children('div').each(_.bind(function (index, element) {
                var blockEncoded = $('<div/>').text($(element).html()).html();
                var snipIndex = index + 1;

                // now that blocks are encoded we can replace data-src with src so it works in the editor
                blockEncoded = blockEncoded.replace(/data-src=/g, 'src=');

                htmlData += '<div id="snip' + snipIndex + '">' + blockEncoded + '</div>';
                htmlThumbs += '<div title="Snippet ' + snipIndex
                    + '" data-snip="' + snipIndex
                    + '" data-cat="' + $(element).data("cat")
                    + '"><img src="' + $(element).data("thumb") + '" /></div>';

            }, this));

            $('#divSnippets').html(htmlData);
            $('#divSnippetList').html(htmlThumbs);
        },

        _initSnippetFilter: function () {
            var select = $('#selSnips');
            var snippetListEl = $('#divSnippetList');

            // init filter categories from configuration
            var optionsHtml = '';
            for (var i = 0; i < this.options.snippetCategories.length; i++) {
                optionsHtml += '<option value="' + this.options.snippetCategories[i][0] + '">'
                    + this.options.snippetCategories[i][1]
                    + '</option>';
            }
            select.html(optionsHtml);

            // gather used category ids from snippets
            var snippetCats = [];
            snippetListEl.find('> div').each(function (index, el) {
                for (var j=0; j < $(el).attr('data-cat').split(',').length; j++) {
                    snippetCats.push.apply(snippetCats, $(el).attr('data-cat').split(','));
                }
            });
            snippetCats = snippetCats.uniq();

            // remove empty categories from select
            select.find('option').each(function (index, el) {
                var optionCategory = $(el).attr('value');
                if (optionCategory != 0 && optionCategory != -1 && $.inArray(optionCategory, snippetCats) == -1) {
                    select.find("option[value='" + optionCategory + "']").remove();
                }
            });

            // apply filter callback
            select.on("change", _.bind(function (event) {
                var snippetListEl = $('#divSnippetList');
                var valueSelected = event.target.value;

                if (valueSelected == '-1') {
                    snippetListEl.find('> div').fadeIn(200);
                } else {
                    snippetListEl.find('> div').fadeOut(200, function () {
                        var elCat = $(this).attr('data-cat');
                        if (elCat && $.inArray(valueSelected, elCat.split(',')) != -1) {
                            $(this).fadeIn(400);
                        }
                    });
                }
            }, this));
        },

        _applyDraggable: function () {
            $('#divSnippetList').find('> div').draggable({
                cursor: 'move',
                helper: _.bind(function (event) {
                    var target = $(event.currentTarget);
                    var helper = target.clone();

                    helper.css('width', target.width() + 'px');
                    helper.css('height', target.height() + 'px');
                    helper.css('border', '2px solid #dedede');
                    helper.css('box-sizing', 'content-box');

                    this.element.parents('.modal-inner-wrap').prepend(helper);
                    return helper;
                }, this),
                zIndex: 10003,
                opacity:.7,
                connectToSortable: this.options.contentSelector
            });
        },

        /**
         * Wrap undecorated text with div and p tags so the editor can work with it
         *
         * @param content
         * @returns {string}
         * @private
         */
        _repairContent: function (content) {
            var result = $('<div/>');

            result.html(content).contents().filter(function () {
                return (this.nodeType === Node.TEXT_NODE && this.textContent && this.textContent.trim().length > 0);
            }).wrap('<div class="row clearfix"><p/></div>');

            result.contents().filter(function () {
                return (this.nodeType === Node.ELEMENT_NODE && this.tagName !== 'DIV');
            }).wrap('<div class="row clearfix"></div>');

            return result.html();
        },

        _makeDirectiveUrl: function(directive) {
            return this.options.directiveUrl.replace('directive', 'directive/___directive/' + directive);
        },

        /**
         * @see vendor/magento/magento2-base/lib/web/mage/adminhtml/wysiwyg/tiny_mce/setup.js
         */
        _encodeDirectives: function(content) {
            // collect all HTML tags with attributes that contain directives
            return content.replace(/<([a-z0-9\-\_]+.+?)([a-z0-9\-\_]+=".*?\{\{.+?\}\}.*?".*?)>/ig, function(m, $1, $2) {
                var attrStr = $2;

                // process tag attributes string
                attrStr = attrStr.replace(/([a-z0-9\-\_]+)="(.*?)(\{\{.+?\}\})(.*?)"/ig, function(m, $1, $2, $3, $4) {
                    return $1 + '="' + $2 + this._makeDirectiveUrl(Base64.mageEncode($3)) + $4 + '"';
                }.bind(this));

                return '<' + $1 + attrStr + '>';
            }.bind(this));
        },

        /**
         * @see vendor/magento/magento2-base/lib/web/mage/adminhtml/wysiwyg/tiny_mce/setup.js
         */
        _decodeDirectives: function(content) {
            // escape special chars in directives url to use it in regular expression
            var url = this._makeDirectiveUrl('%directive%').replace(/([$^.?*!+:=()\[\]{}|\\])/g, '\\$1');
            var reg = new RegExp(url.replace('%directive%', '([a-zA-Z0-9,_-]+)'), 'g');
            return content.replace(reg, function(m, $1) {
                return Base64.mageDecode($1);
            }.bind(this));
        },

        _getValHookEncodeDirective: function (el) {
            if ((el.id == 'txtImgUrl' || el.id == 'txtLink') && el.value.trim().indexOf('{{') == 0) {
                return this._makeDirectiveUrl(Base64.mageEncode(el.value.trim()));
            }

            // call existing hook if present
            if (this.superHooks.val.input.get) {
                return this.superHooks.val.input.get(el);
            }
            return undefined;   // let jquery handle this
        },

        _setValHookDecodeDirective: function (el, value) {
            if (el.id == 'txtImgUrl' || el.id == 'txtLink') {
                el.value = this._decodeDirectives(value);
                return true;    // tell jquery we handled this
            }

            // call existing hook if present
            if (this.superHooks.val.input.set) {
                return this.superHooks.val.input.set(el, value);
            }
        },

        /**
         * Fixes absolute positioning bug in the content builder library
         *
         * @param el
         * @param val
         * @returns {*}
         * @private
         */
        _setCssHookLeft: function (el, val) {
            if (this.cssHookPositionFixedElements.indexOf(el.id) != -1) {
                return (parseFloat(val) - this.element.parent().offset().left) + 'px';
            }

            // call existing hook if present
            if (this.superHooks.css.left.set) {
                return this.superHooks.css.left.set(el, val);
            }
            return val;
        },

        /**
         * Fixes absolute positioning bug in the content builder library
         *
         * @param el
         * @param val
         * @returns {*}
         * @private
         */
        _setCssHookTop: function (el, val) {
            if (this.cssHookPositionFixedElements.indexOf(el.id) != -1) {
                return (parseFloat(val) - $(window).scrollTop()) + 'px';
            }

            // call existing hook if present
            if (this.superHooks.css.top.set) {
                return this.superHooks.css.top.set(el, val);
            }
            return val;
        }
    });

    // fix for jquery/jstree/jquery.jstree hotkeys wildly killing space and esc keystrokes
    (function() {
        var origKeydownAdd = function(){};

        // this should capture the special handler which is set by jquery.hotkeys
        if ($.event.special.keydown && $.event.special.keydown.add) {
            origKeydownAdd = $.event.special.keydown.add;
        }

        // just in case there wasn't a special handler already present
        if (!$.event.special.keydown) {
            $.event.special.keydown = {};
        }

        var keydownAdd = function (handleObj) {
            // call original special handler first so we are wrapping it's wrappers
            origKeydownAdd(handleObj);

            // only care when handler is for a possible "hotkey" handler
            if (typeof handleObj.data !== "string") {
                return;
            }

            var origHandler = handleObj.handler;
            handleObj.handler = function (event) {
                // don't fire "hotkey" handlers within content editor area
                if (this !== event.target && $(event.target).parents('#elements_editor_content').length > 0) {
                    return;
                }
                return origHandler.apply(this, arguments);
            };
        };
        $.event.special.keydown.add = keydownAdd;
    })();

    return $.Codealist_ContentBuilder.editor;
});
