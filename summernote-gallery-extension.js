(function(factory)
{
    /* global define */
    if (typeof define === 'function' && define.amd)
    {
        // AMD. Register as an anonymous module.
        define(['jquery'], factory);
    }
    else if (typeof module === 'object' && module.exports)
    {
        // Node/CommonJS
        module.exports = factory(require('jquery'));
    }
    else
    {
        // Browser globals
        factory(window.jQuery);
    }
}(function($)
{
    var SummernoteGallery = CreateSummernoteGalleryClass();
    var GalleryModal = CreateGalleryModalClass();

    var summernote_gallery = new SummernoteGallery({
        name: 'gallery',
        tooltip: 'Gallery',
    });

    // add the plugin to summernote
    $.extend($.summernote.plugins, summernote_gallery.getPlugin());

/************************************** GalleryModal ***************************************/
    function CreateGalleryModalClass() {
        function GalleryModal(options) {
            this.options = options;
            this.template = this.getModalTemplate();
            this.$modal = $(this.template).hide();
            this.events_queue = {};
            // class to add to images when selected
            this.select_class = "selected-img";
            this.addStyleToDom();

            this.attachEvents();
        }

        GalleryModal.prototype.setContent = function(content) {
            // set variabl parts to modal html
            this.$modal.find('.modal-title').html(this.options.title);
            this.$modal.find('#close').html(this.options.close_text);
            this.$modal.find('#save').html(this.options.ok_text);

            this.$modal.find('.modal-body').html(content);

            this.attachContentEvents();
        }

        GalleryModal.prototype.on = function (event_name, closure) {
            if (! Array.isArray(this.events_queue[event_name]) ) {
                this.events_queue[event_name] = [];
            }

            this.events_queue[event_name].push(closure)
        }

        GalleryModal.prototype.triggerEvent = function (event_name, params) {
            var events = this.events_queue[event_name] || [];

            for (var i = 0; i < events.length; i++) {
                events[i].apply(this, params);
            }
        }

        GalleryModal.prototype.attachEvents = function() {
            var _this = this;
            var $modal = this.$modal;

            // add selected images to summernote editor
            $modal.find("button#save").click(function(event) {
                var $selected_img = $modal.find('.img-item img.' + _this.select_class);

                $modal.modal('hide')

                _this.triggerEvent('beforeSave', [_this]);

                $selected_img.each(function(index, el)
                {
                    _this.triggerEvent('onSave', [_this, $(this)]);

                    $(this).removeClass(_this.select_class);
                });

                _this.triggerEvent('afterSave', [this]);
            });
        }

        GalleryModal.prototype.attachContentEvents = function() {
            var _this = this;

            // images click event to select image
            this.$modal.find('img').click(function(event)
            {
                $(this).toggleClass(_this.select_class);
            });
        }

        GalleryModal.prototype.open = function() {
            this.$modal.modal();
        }

        GalleryModal.prototype.getModalTemplate = function() {

            var bootsrap_version = parseInt($.fn.modal.Constructor.VERSION);
            var header_content = [
                '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
                '<h4 class="modal-title">[gallery title]</h4>'
            ];

            var modal_html = ''+
                '<div class="modal fade" tabindex="-1" role="dialog">'
                    + '<div class="modal-lg modal-dialog ">'
                        + '<div class="modal-content">'
                            + '<div class="modal-header">'
                                + (bootsrap_version == 3 ? header_content.join('') : header_content.reverse().join(''))
                            + '</div>'
                            + '<div class="modal-body">'
                                + '<p class="text-danger" >no image was set. open the browser console to see if there is any errors messages. if not dig into source file to see what\'s wrong.</p>'
                                + '<small class="text-muted"><a target="_blank" href="https://github.com/eissasoubhi/summernote-gallery/issues/new"> Or open an issue on github</a></small>'
                            + '</div>'
                            + '<div class="modal-footer">'
                                + '<button type="button" id="close" class="btn btn-default" data-dismiss="modal">[Close]</button>'
                                + '<button type="button" id="save" class="btn btn-primary">[Add]</button>'
                            + '</div>'
                        + '</div>'
                    + '</div>'
                + '</div>';

            return modal_html;
        }

        GalleryModal.prototype.addStyleToDom = function() {
            // style to add to selected image
            this.$css = $('<style>'
                            +'.img-item{'
                                +'position : relative;'
                            +'}'
                            +'.img-item .fa-check{'
                                +'position : absolute;'
                                +'top : -10px;'
                                +'right : 5px;'
                                +'font-size: 30px;'
                                +'color: #337AB7;'
                            +'}'
                            +'.img-item .fa-check{'
                                +'display : none;'
                            +'}'
                            +'.img-item .'+ this.select_class +' + .fa-check{'
                                +'display : block;'
                            +'}'
                            +'.'+ this.select_class +'{'
                                +'background-color: #5CB85C;'
                            +'}'
                        +'</style>');
            this.$css.appendTo('body');
        }

        return GalleryModal;
    }

/************************************** SummernoteGallery ***************************************/
    function CreateSummernoteGalleryClass () {
        function SummernoteGallery(options) {
            this.options = $.extend({
                name: 'summernote-gallery',
                button_label: '<i class="fa fa-file-image-o"></i>',
                tooltip: 'summernote gallery'
            }, options);

            this.plugin_default_options = {
                'url': null,
                'content': null,
                'title': 'summernote image gallery',
                'close_text': 'Close',
                'ok_text': 'Add',
            }
        }

        SummernoteGallery.prototype.getPlugin = function () {
            var _this = this;
            var plugin = {};

            plugin[this.options.name] = function(context) {

                // add gallery button
                context.memo('button.' + _this.options.name, _this.createButton());

                this.events = {
                    'summernote.keyup': function(we, e)
                    {
                        _this.saveLastFocusedElement();
                    }
                };

                this.initialize = function() {
                    // entry
                    _this.initGallery(context);
                };
            }

            return plugin;
        }

        SummernoteGallery.prototype.getImagesFromUrl = function() {
            var _this = this;

            $.get(this.plugin_options.url, function(content)
            {
                _this.modal.setContent(content)
            }).fail(function()
            {
                console.error("problem loading from "+_this.plugin_options.url);
            })
        }

        // set the focus to the last focused element in the editor
        SummernoteGallery.prototype.recoverEditorFocus = function () {
            var last_focused_el = $(this.editor).data('last_focused_element');
            if(typeof last_focused_el !== "undefined")
            {
                var editor = this.editable;
                var range = document.createRange();
                var sel = window.getSelection();
                var cursor_position =  last_focused_el.length;

                range.setStart(last_focused_el, cursor_position);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                editor.focus();
            }
        }

        SummernoteGallery.prototype.saveLastFocusedElement = function() {
            var focused_element = window.getSelection().focusNode;
            var parent = $(this.editable).get(0);
            if ($.contains(parent, focused_element))
            {
                $(this.editor).data('last_focused_element', focused_element)
            };
        }

        SummernoteGallery.prototype.attachEditorEvents = function () {
            var _this = this;

            $(this.editable).on('keypress, mousemove', function() {
                _this.saveLastFocusedElement();
            })
        }

        // entry method
        SummernoteGallery.prototype.initGallery = function (context) {
            this.context = context;
            this.editor = this.context.layoutInfo.note;
            this.editable = this.context.layoutInfo.editable; //contentEditable element
            this.plugin_options = $.extend(this.plugin_default_options, this.context.options[this.options.name] || {});

            this.modal = new GalleryModal({
                title: this.plugin_options.title,
                close_text: this.plugin_options.close_text,
                ok_text: this.plugin_options.ok_text
            });

            this.attachModalEvents();
            this.attachEditorEvents();
        }

        SummernoteGallery.prototype.attachModalEvents = function() {
            var _this = this;

            this.modal.on('beforeSave', function (gallery_modal) {
                _this.recoverEditorFocus();
            })

            this.modal.on('onSave', function (gallery_modal, $image) {
                _this.context.invoke(
                    'editor.pasteHTML',
                    '<img src="' + $image.attr('src') + '" alt="' + ($image.attr('alt') || "") + '" />'
                );
            })
        }

        SummernoteGallery.prototype.createButton = function() {
            var _this = this;

            var button = $.summernote.ui.button({
                contents: this.options.button_label,
                tooltip: this.options.tooltip,
                click: function()
                {
                    _this.openGallery();
                }
            });

            // create jQuery object from button instance.
            $gallery = button.render();
            return $gallery;
        }

        SummernoteGallery.prototype.fillModal = function() {
            //fill modal with images whether from url or given html

            if (this.plugin_options.content)
            {
                this.modal.setContent(this.plugin_options.content)
            }
            else if (this.plugin_options.url)
            {
                this.getImagesFromUrl();
            }
            else
            {
                console.error("options 'content' or 'url' must be set");
            }
        }

        SummernoteGallery.prototype.openGallery = function () {
            this.fillModal();
            this.modal.open();
        }

        return SummernoteGallery;
    };
}));
