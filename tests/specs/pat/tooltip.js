define(["pat-tooltip", "pat-inject"], function(pattern, inject) {
    var utils = {
        createTooltip: function(c) {
            var cfg = c || {};
            return $("<a/>", {
                "id":   cfg.id || "tooltip",
                "href": cfg.href || "#anchor",
                "title": cfg.title || "tooltip title attribute",
                "data-pat-tooltip": "" || cfg.data,
                "class": "pat-tooltip"
            }).appendTo($("div#lab"));
        },

        removeTooltip: function removeTooltip() {
            var $el = $("a#tooltip");
            $el.remove();
        },

        createTooltipSource: function() {
            return $("<span style='display: none' id='tooltip-source'>"+
                    "<stong>Local content</strong></span>")
                .appendTo($("div#lab"));
        },

        click: {
            type: "click",
            preventDefault: function () {}
        }
    };

    describe("pat-tooltip", function () {
        beforeEach(function() {
            $("<div/>", {id: "lab"}).appendTo(document.body);
        });

        afterEach(function() {
            $("#lab").remove();
        });

        describe("When a tooltip is clicked", function () {
            describe("if the tootip is a hyperlink", function () {
                beforeEach(function() {
                    utils.createTooltip();
                });
                afterEach(function() {
                    utils.removeTooltip();
                });
                it("the default click action is prevented", function () {
                    var $el = $("a#tooltip");
                    spyOn(pattern, "show").andCallThrough();
                    spyOn(utils.click, "preventDefault");
                    pattern.init($el);
                    $el.trigger(utils.click);
                    expect(pattern.show).toHaveBeenCalled();
                    expect(utils.click.preventDefault).toHaveBeenCalled();
                });
            });

            describe("if the 'source' parameter is 'title'", function () {
                afterEach(function() {
                    utils.removeTooltip();
                });
                it("will will show the contents of the 'title' attribute", function () {
                    utils.createTooltip({data: "source: title"});
                    var $el = $("a#tooltip");
                    spyOn(pattern, "show").andCallThrough();
                    var title = $el.attr("title");
                    pattern.init($el);
                    // The 'title' attr gets removed, otherwise the browser's
                    // tooltip will appear
                    expect($el.attr("title")).toBeFalsy();

                    $el.trigger(utils.click);
                    expect(pattern.show).toHaveBeenCalled();
                    var $container = $el.data("patterns.tooltip.container");
                    expect($container.text()).toBe(title);
                });
            });

            describe("if the 'source' parameter is 'ajax'", function () {
                afterEach(function() {
                    utils.removeTooltip();
                });
                it("will fetch its contents via ajax", function () {
                    utils.createTooltip({data: "source: auto", href: "/tests/content.html#content"});
                    var $el = $("a#tooltip");
                    spyOn(pattern, "show").andCallThrough();
                    spyOn(inject, "execute"); //.andCallThrough();
                    pattern.init($el);
                    runs(function () {
                        $el.trigger(utils.click);
                    });
                    waits(200);
                    runs(function () {
                        expect(pattern.show).toHaveBeenCalled();
                        expect(inject.execute).toHaveBeenCalled();
                        /* XXX: The ajax call works fine in the browser but not
                         * via PhantomJS. Will have to debug later.
                         *
                        var $container = $el.data("patterns.tooltip.container");
                        // Content is fetched from ./tests/content.html#content
                        expect($container.text()).toBe(
                            "External content fetched via an HTTP request.");
                        */
                    });
                });
            });

            describe("if the 'source' parameter is 'content'", function () {
                afterEach(function() {
                    utils.removeTooltip();
                });
                it("will clone a DOM element from the page", function () {
                    utils.createTooltip({data: "source: content", href: "#tooltip-source"});
                    utils.createTooltipSource();
                    var $el = $("a#tooltip");
                    spyOn(pattern, "show").andCallThrough();
                    pattern.init($el);
                    $el.trigger(utils.click);
                    expect(pattern.show).toHaveBeenCalled();
                    var $container = $el.data("patterns.tooltip.container");
                    expect($container.text()).toBe("Local content");
                });
            });

            describe("if the 'source' parameter is 'auto'", function () {
                afterEach(function() {
                    utils.removeTooltip();
                });
                it("will revert to 'ajax' if 'href' points to an external URL", function () {
                    utils.createTooltip({data: "source: auto", href: "/tests/content.html#content"});
                    var $el = $("a#tooltip");
                    pattern.init($el);
                    var options = $el.data("patterns.tooltip");
                    expect(options.source).toBe("ajax");
                });

                it("will revert to 'content' if 'href' points to a document fragment", function () {
                    utils.createTooltipSource();
                    utils.createTooltip({data: "source: auto", href: "#tooltip-source"});
                    var $el = $("a#tooltip");
                    pattern.init($el);
                    var options = $el.data("patterns.tooltip");
                    expect(options.source).toBe("content");
                });
            });
        });
    });

});
// jshint indent: 4, browser: true, jquery: true, quotmark: double