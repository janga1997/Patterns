define([
    'require',
    '../logging',
    '../patterns'
], function(require) {
    var log = require('../logging').getLogger('edit');

    // create a div after the textarea
    // copy the textarea's content unquoted to the div
    // hide the textarea
    // copy content back before form is serialized
    var text2div = function($el) {
        // hide textarea
        $el.hide();

        // make sure textarea has an id
        // XXX: generate something proper
        var id = $el.attr('id');
        if (!id) {
            id = "my-id-that-should-be-replaced-by-something-unique";
            $el.attr({id: id});
        }

        // create contenteditable div
        var editid = 'edit-' + id,
            $edit = $('<div id="' + editid + '" contenteditable="true"/>').insertAfter($el);
        // XXX: filter to avoid scripting attacks
        $edit.html($el.val());
        $edit.attr({style: 'min-height: 50px'});

        // ensure form is ajaxified and copy content back before serialize
        var ajaxify = require('../patterns').ajaxify.init,
            $form    = $el.parents('form');
        ajaxify($form);
        $form.on('form-pre-serialize', function() {
            $el.html($edit.html());
        });

        return $edit;
    };

    // utility method for determining if something is contenteditable
    var is_contenteditable = function(el) {
        return $(el).is("[contenteditable=true]") || (
            $(el).parents("[contenteditable=true]").length > 0
        );
    };

    // simply replaces
    // rather than toggles, but
    // theres no reason you couldn't have
    // it do both!
    var wrap_selection = function(wrap_html){
        var selection_node = $(window.getSelection().anchorNode);
        if(is_contenteditable(selection_node)) {
            // You just want to unwrap if your
            // parent is already selected
            if(selection_node.parent().is(wrap_html)) {
                selection_node.unwrap();
            }
            else {
                selection_node.wrap("<" + wrap_html + ">");
            }
        }
        // wrap() normally breaks contentEditable
        // this is a hacky replacement
        selection_node.attr('contenteditable', true);
    };


    /*
     * controls and functions to handle them
     */

    var ctrls = {
        b: {
            cmd: 'bold',
            selector: '.strong'
        },
        i: {
            cmd: 'italic',
            selector: '.emphasised'
        },
        ol: {
            cmd: 'insertorderedlist',
            selector: '.list-ordered'
        },
        ul: {
            cmd: 'insertunorderedlist',
            selector: '.list-unordered'
        }
    };

    // generate a cmd function to be used as an event handler
    var cmdfn = function(ctrl, opts) {
        opts = opts || {};
        return function(ev) {
            var $ctrl = $(ev.target);

            // execute command and log about it
            log.debug('exec:', ctrl.cmd, 'triggered by', $ctrl);
            document.execCommand(ctrl.cmd, opts.showui || false, opts.val || '');

            // remove selected if control is in a exclusive group
            $ctrl.parents('.exclusive').each(function() {
                $(this).find('.selected').each(function() {
                    // don't remove selected for the clicked control
                    // it is toggle later on
                    if (this !== ev.target) $(this).removeClass('selected');
                });
            });

            // toggle selected
            $ctrl.toggleClass('selected');
        };
    };

    var initctrls = function(selector) {
        var $ctrls = $(selector);
        for (var tag in ctrls) {
            var ctrl = ctrls[tag],
                $ctrl = $ctrls.find(ctrl.selector);
            if ($ctrl.length === 0) continue;
            log.debug('found control:', tag, $ctrl);
            $ctrl.on('click', cmdfn(ctrl));
        }
        return $ctrls;
    };

    var updatectrls = function($ctrls) {
        // unselect all controls - XXX: is there seriously no better way?
        //$ctrls.find('.selected').removeClass('selected');

        for (var tag in ctrls) {
            var ctrl = ctrls[tag];
            $ctrls.find(ctrl.selector)[
                document.queryCommandState(ctrl.cmd)
                    ? 'addClass'
                    : 'removeClass'
            ]('selected');
        }
    };


    var init = function($el, opts) {
        var $edit = text2div($el),
            $ctrls = initctrls('.editor-controls');

        $edit.on('keyup mouseup', function() {
            updatectrls($ctrls);
        });

        var buttons  = {};
        buttons.clear               = $ctrls.find('.clear');
        buttons.inserth1            = $ctrls.find('.header_1');
        buttons.inserth2            = $ctrls.find('.header_2');
        buttons.inserth3            = $ctrls.find('.header_3');
        buttons.upload_image        = $ctrls.find('.upload_image');
        buttons.link_image          = $ctrls.find('.link_image');

        var button_handler = {
            'insertparagraph'       : function(){ return 0; },
            'inserth1'              : function(){ wrap_selection('h1') },
            'inserth2'              : function(){ wrap_selection('h2') },
            'inserth3'              : function(){ wrap_selection('h3') },
            'clear'                 : function(){
                var selection_node = $(window.getSelection().anchorNode);
                document.execCommand('removeformat');
                if (is_contenteditable(selection_node)) {
                    selection_node.unwrap();
                    if (!$(selection_node).parent().is("p")) {
                        $(selection_node).wrap('<p>');
                    }
                }
            },
            'upload_image'          : function(){ document.execCommand(); },
            'link_image'            : function(){
                var source = prompt('URL of Image');
                if(source) {
                    document.execCommand('insertImage', false, source);
                }
            }
        };

        // lame helper that
        // toggles the class,
        // triggers the handler
        var button_click = function(element) {
            buttons[element].toggleClass('selected');
            button_handler[element]();
        };

        // bind click to button_click()/1
        for (var key in buttons) {
            buttons[key].click(function(element){
                return function() {
                    log.debug('clicked', element);
                    button_click(element);
                };
            }(key));
        }

    };

    var pattern = {
        markup_trigger: 'form textarea.edit',
        initialised_class: 'edit',
        init: init
    };
    return pattern;
});
