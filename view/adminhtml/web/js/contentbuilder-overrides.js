/*
Contentbuilder creates a custom function to replace the use of jQuery offset() when using IE or Edge, which causes problems
with the Elements editor. This file overrides the getPos() custom function and causes it to return the values from offset().
 */
jQuery.fn.getPos = function () {
    return this.offset();
};