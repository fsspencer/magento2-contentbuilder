/**
 * @category    Codealist
 * @package     ContentBuilder
 * @copyright   Copyright (c) 2018 ContentBuilder
 */

var config = {
    shim: {
        'jquery/jstree/jquery.jstree': {
            deps: ['Codealist_ContentBuilder/js/editor']
        },
        'Codealist_ContentBuilder/js/contentbuilder-overrides': {
            deps: ['Codealist_ContentBuilder/lib/contentbuilder/contentbuilder-src']
        }
    }
};
