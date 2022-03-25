// ==UserScript==
// @name         Trello | Make Trello Awesome Again
// @namespace    https://ericdraken.com/
// @version      1.0
// @description  Remove free trial nags; use earthtones for columns; set a dark background
// @author       Eric Draken (ericdraken.com)
// @match        https://trello.com/b/*
// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=trello.com
// @grant        none
// ==/UserScript==

/*global jQuery*/
/*eslint no-multi-spaces: "off"*/

(function($) {
    'use strict';

    const debug = false;  // Turn on for detailed console logs

    const fuzzy_matches = {

        /***** Add column colours *****/

        'green column': {      // Just a unique key
            text: 'Complete',  // Search for this text in the column name
            target: 'h2',
            closest: '.js-list.list-wrapper',
            children: [{
                target: '.list.js-list-content',    // Column card holder
                css: {'background-color': 'hsl(74deg 13% 49%)'}
            },{
                target: '.list-card-details',       // Card in the column
                css: {'background-color': 'hsl(74deg 13% 79%)', 'border': 'solid 1px hsl(74deg 13% 39%)'}
            }]
        },
        'yellow column':{
            text: 'In Progress',
            target: 'h2',
            closest: '.js-list.list-wrapper',
            children: [{
                target: '.list.js-list-content',
                css: {'background-color': 'hsl(35deg 100% 39%)'}
            },{
                target: '.list-card-details',
                css: {'background-color': 'hsl(35deg 100% 69%)', 'border': 'solid 1px hsl(35deg 100% 29%)'}
            }]
        },
        'blue column':{
            text: '[Misc]',
            target: 'h2',
            closest: '.js-list.list-wrapper',
            children: [{
                target: '.list.js-list-content',
                css: {'background-color': 'hsl(207deg 15% 32%)'}
            },{
                target: '.list-card-details',
                css: {'background-color': 'hsl(207deg 15% 62%)', 'border': 'solid 1px hsl(207deg 15% 22%)'}
            }]
        },
        'red column':{
            text: 'Blocked',
            target: 'h2',
            closest: '.js-list.list-wrapper',
            children: [{
                target: '.list.js-list-content',
                css: {'background-color': 'hsl(13deg 48% 43%)'}
            },{
                target: '.list-card-details',
                css: {'background-color': 'hsl(13deg 48% 73%)', 'border': 'solid 1px hsl(13deg 48% 33%)'}
            }]
        },
        'purple column':{
            text: '[Setup]',
            target: 'h2',
            closest: '.js-list.list-wrapper',
            children: [{
                target: '.list.js-list-content',
                css: {'background-color': 'hsl(214deg 9% 52%)'}
            },{
                target: '.list-card-details',
                css: {'background-color': 'hsl(214deg 9% 82%)', 'border': 'solid 1px hsl(214deg 9% 42%)'}
            }]
        },
        'bluish column':{
            text: '[Project]',
            target: 'h2',
            closest: '.js-list.list-wrapper',
            children: [{
                target: '.list.js-list-content',
                css: {'background-color': 'hsl(191deg 100% 28%)'}
            },{
                target: '.list-card-details',
                css: {'background-color': 'hsl(191deg 100% 58%)', 'border': 'solid 1px hsl(191deg 100% 8%)'}
            }]
        },

        /***** Remove nag elements *****/

        'left nav > Try Premium free': {  // Just a unique key
            text: 'Premium free',         // Search for this text
            target: 'button div',
            closest: '.js-react-root',
            children: [{
                target: '.',
                css: {'display': 'none'}
            }]
        },
        'left nav > Free': {
            text: 'Free',
            target: '.js-react-root > nav p',
            closest: '.',
            children: [{
                target: '.',
                css: {'display': 'none'}
            }]
        },
    };

    const exact_matches = {

        /***** Add column colours *****/

        'Add a card': {
            target: 'a.open-card-composer.js-open-card-composer > .js-add-a-card',
            css: {'color': '#172b4d'}
        },
        'board icons': {
            target: '#board .icon-sm, #board .icon-md, #board .icon-lg',
            css: {'color': '#172b4d'}
        },

        /***** Black board background *****/

        'black board background': {
            target: '#trello-root',
            css: {'background-color': '#000'}
        },

        /***** Remove nag elements *****/

        'board menu > custom fields': {
            target: '.board-menu-navigation-item.disabled',
            css: {'display': 'none'}
        },
        'card edit screen > Start free trial': {
            target: '.button-link.disabled',
            css: {'display': 'none'}
        },
        'anything disabled': {
            target: '.disabled',
            css: {'display': 'none'}
        },
        'card edit screen > Disabled custom fields': {
            target: '.js-card-back-custom-fields-prompt',
            css: {'display': 'none'}
        },

        /***** Enhancements *****/

        'show label labels by default': {
            target: '.card-label.mod-card-front',
            css: {
                'height': '16px',
                'line-height': '16px',
                'max-width': '198px',
                'padding': '0 8px',
            }
        }
    };

    /***** Business logic *****/

    const addCSSRule = (selector, css_obj) => {
        if ( typeof css_obj !== 'object' ) throw "Use objects";
        const style_id = 'newTrelloStyle';
        const style = document.getElementById(style_id) || (function() {
            const style = document.createElement('style');
            style.type = 'text/css';
            style.id = style_id;
            document.head.appendChild(style);
            return style;
        })();
        const sheet = style.sheet;
        let css = selector + ' {';
        for (const [key, val] of Object.entries(css_obj)) {
            css += `${key}: ${val} !important`;
        }
        css += '}';
        sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length);
        debug && console.log(`[Debug:addCSSRule] ${css} at ${(sheet.rules || sheet.cssRules || []).length}`)
    }

    const getCSSSelector = ($this, path) => {
        if ( typeof $this.get(0) === 'undefined' ) return '';
		if ( typeof path === 'undefined' ) path = '';
        if ( $this.is('html') ) return 'html' + path;

        let cur = $this.get(0).tagName.toLowerCase();
        let id = $this.attr('id')
        let clazz = $this.attr('class');

        debug && console.log(`[Debug:getCSSSelector]> ${cur}, ${id}, ${clazz}, (${path})`);

        // Build a selector with the highest specifity
        if ( typeof id !== 'undefined' ) {
            return cur + '#' + id + path;
        } else if ( typeof clazz !== 'undefined' ) {
            cur += '.' + clazz.split(/[\s\n]+/).join('.');
        }

        // Recurse up the DOM
        return getCSSSelector($this.parent(), ' > ' + cur + path );
    };

    const actionFn = () => {
        // Exact matches
        for (const [rule, entry] of Object.entries(exact_matches)) {
            let $target = $(entry.target);
            if($target.length) {
                debug && console.log(`[Debug:actionFn] ${getCSSSelector($target)} css: ${JSON.stringify(entry.css)}`);

                // Only run these CSS rules once, ever
                addCSSRule(entry.target, entry.css);
                delete exact_matches[rule];
            }
        }

        // Fuzzy matches first
        for (const [_, entry] of Object.entries(fuzzy_matches)) {
            let $targets = $(`${entry.target}:contains('${entry.text}')`);
            $targets.each((_, elem) => {
                let $parent = entry.closest != '.' ? $(elem).closest(entry.closest) : $(elem);
                if ($parent.length) {
                    debug && console.log(`[Debug:actionFn] Closest ancestor (${entry.closest}) found from ${elem.tagName}`);
                    for (const child of entry.children) {
                        let $div = child.target !== '.' ? $parent.find(child.target) : $parent;
                        if ($div.length) {
                            debug && console.log(`[Debug:actionFn] ${getCSSSelector($div)} css: ${JSON.stringify(child.css)}`);
                            $div.css(child.css);
                        }
                    }
                }
            });
        }
    };

    let timer = setInterval(actionFn, 1000);  // No choice but to apply periodically as this is a React app
    $(actionFn);  // Run once when the DOM is ready

})(jQuery.noConflict());
