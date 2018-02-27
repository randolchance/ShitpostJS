var ShitpostView = function() {
    this.init();
};

ShitpostView.prototype = {

    init: function() {
        this.span = 4;
        this.postsPerPage = 25;
        this.page = 0;

        // Replace with actual login stuff
        this.user = 'D'; // Temporary user set

        this.updateURL({
            user: this.user,
            page: this.page
        });

        var node = $('.main');
        this.buildNewShitpostEntryView(node);

        this.getShitposts();
        this.pollShitposts();
    },

    /*--- Define debug function ---*/

    debug: function(item) {
        var node = $('.test');
        if (item.isArray) {
            item.each(function(arrayItem) {
                $('<div>' + arrayItem + '</div>').appendTo(node);
            });
        } else if (item instanceof Object) {
            $.each(item, function(key,value) {
                $('<div>key: ' + key + ', value: ' + value + '</div>').appendTo(node);
            });
        } else {
            $('<div>' + item + '</div>').appendTo(node);
        }
        return this;
    },

    /*--- Define helper functions ---*/

    GetURLParameter: function(param) {
        var url = String(window.location.search);
        if (url == "") {
            return false;
        }
        var paramStrings = url.split('?');
        paramStrings = paramStrings[1].split('\&');
        var returnObj = {};
        for (var i = 0; i < paramStrings.length; i++) {
            var paramArray = paramStrings[i].split('\=');
            if (typeof param === "undefined" || param === null) {
                returnObj[paramArray[0]] = paramArray[1];
            } else {
                if (paramArray[0] == param) {
                    return paramArray[1];
                }
            }
        }
        return returnObj;
    },

    updateURL: function(newParams) {
        if (history.pushState) {
            var newUrl = window.location.pathname + '?';

            var oldParams = this.GetURLParameter();
            $.each(oldParams, function(key,value) {
                if (!(key in newParams)) {
                    newParams[key] = value;
                }
            });

            $.each(newParams, function(key,value) {
                newUrl += key + '=' + value + "\&";
            });
            newUrl = newUrl.slice(0,-1);
            window.history.pushState({path:newUrl},'',newUrl);
        }
        return newUrl;
    },

    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    pollShitposts: async function() {
        while (1) {
            await this.sleep(2000);
            this.getShitposts();
        }
    },

    /*--- Define communcation protocol to PHP controller ---*/
    getShitposts: function() {
        $.ajax({
            type: 'POST',
            url: 'http://localhost/ShitpostController.php',
            context: document,
            data: {
                func: 'getShitposts',
                vars: {
                    user: this.GetURLParameter('user'),
                    page: this.GetURLParameter('page'),
                    postsPerPage: this.postsPerPage
                }
            }
        }).done(function(data) {
            //ShitpostView.prototype.debug(data);
            if (data['Error']) {
                this.debug(data['Error']);
            }
            var dataArray = $.parseJSON(data);
            var currentPage = Number(dataArray['page']);

            // Use returned JSON value 'totalPages' to build pagination
            var node = $('.pagination');
            ShitpostView.prototype.buildPaginationView(dataArray['totalPages'],node,currentPage);

            // Use returned JSON to build html for shitpost entries
            node = $('.shitEntries');
            ShitpostView.prototype.buildShitpostEntriesView(dataArray['resultsArray'],node);
        });
    },

    buildPaginationView: function(total,node,page) {
        var first = ((page - this.span) > 0) ? (page - this.span) : 0;
        var final = ((page + this.span) < total ) ? (page + this.span) : (total-1);
        // Erase node contents
        node.empty();
        // Build First and Previous page buttons
        var obj = ShitpostView.prototype;
        if (page > 0) {
            // Build First page button
            $('<div class="pageButton firstPage">&lt;&lt;</div>').appendTo(node);
            $('.firstPage').click(function() {
                page = 0;
                obj.updateURL({'page':page});
                obj.getShitposts();
            });
            // Build Previous page button
            $('<div class="pageButton prevPage">&lt;</div>').appendTo(node);
            $('.prevPage').click(function() {
                page -= 1;
                obj.updateURL({'page':page});
                obj.getShitposts();
            });
        }
        // Build the page buttons over twice the span
        for(var p = first; p <= final; p++) {
            var desiredID = 'page' + p;
            if (page == p) {
                $('<div class="pageCurrent ' + desiredID + '">' + (p + 1) + '</div>').appendTo(node);
            } else {
                $('<div class="pageButton ' + desiredID + '">' + (p + 1) + '</div>').appendTo(node);
                $('.' + desiredID).click(function(p) {
                    return function () {
                        obj.updateURL({'page':p});
                        obj.getShitposts();
                    }
                }(p));
            }
        }
        // Build Next and Final page buttons
        if (page < final) {
            // Build Next page button
            $('<div class="pageButton nextPage">&gt;</div>').appendTo(node);
            $('.nextPage').click(function() {
                page += 1;
                obj.updateURL({'page':page});
                obj.getShitposts();
            });
            // Build Last page button
            $('<div class="pageButton lastPage">&gt;&gt;</div>').appendTo(node);
            $('.lastPage').click(function() {
                obj.updateURL({'page': final});
                obj.getShitposts();
            });
        }
    },

    buildShitpostEntriesView: function(shitpostArray,node) {
        // Erase node contents
        node.empty();
        $.each(shitpostArray, function(i,shitpostData) {
            var ID = 'post' + shitpostData['shitID'];
            var content =
            '<div class="Date '+ID+'">'+shitpostData['shitDate']+'</div>' +
            '<div class="Entry '+ID+'">' +
                '<div class="Stamp '+ID+'">' +
                    '<div class="Time '+ID+'">'+shitpostData['shitTime']+'</div>' +
                    '<div class="User '+ID+'">'+shitpostData['shitUser']+'</div>' +
                '</div>' +
                '<div class="Shitpost '+ID+'">'+shitpostData['shitPost']+'</div>' +
            '</div>';
            $(content).appendTo(node);
        });
    },

    buildNewShitpostEntryView: function(node) {
        // Build form content
        var content =
            '<div class="newEntry">' +
                '<div>' +
                    '<div class="userBar">User: '+this.user+'</div>' +
                    '<div>' +
                        '<textarea name="newEntry" rows="8" cols="80"></textarea><br>' +
                        '<span class="error"></span><br>' +
                    '</div>' +
                '<div class="submitButton">SHITPOST!</div>' +
            '</div>' +
            '</div>';
        // Attach content
        $(content).appendTo(node);

        // Build form functionality
        $('.submitButton').click(function () {
            var newShitpost = $('textarea[name="newEntry"]').val();
            if ((newShitpost === null) || (newShitpost === '')) {
                $(".error").text('Empty shitposts not allowed!');
            } else {
                $.ajax({
                    type: 'POST',
                    url: 'http://localhost/ShitpostController.php',
                    context: document,
                    data: {
                        func: 'createShitpost',
                            user: ShitpostView.prototype.GetURLParameter('user'),
                            shitpost: newShitpost
                    }
                }).done(function (data) {
                    if (data['Error']) {
                        ShitpostView.prototype.debug(data['Error']);
                    }
                    $(".error").empty();
                    $('textarea').val('');
                    ShitpostView.prototype.updateURL({page: 0});
                    ShitpostView.prototype.getShitposts();
                });
            }
        });
    }
};