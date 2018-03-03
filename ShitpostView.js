var ShitpostView = function() {
    this.init();
};

ShitpostView.prototype = {

    init: function() {

        // span must be odd
        this.span = 9;
        this.postsPerPage = 25;
        this.page = 0;
        this.lastID = -1;
        this.totalPages = null;
        this.isFirstBuild = true;

        // Replace with actual login stuff
        this.user = 'D'; // Temporary user set

        this.updateURL({
            user: this.user,
            page: this.page
        });

        this.operate();
        /*
        var node = $('.main');
        this.buildNewShitpostEntryView(node);
        this.getShitposts();
        this.pollShitposts();
        */
    },

    operate: function() {
        var node = $('.main');
        this.buildNewShitpostEntryView(node);
        this.getShitposts();
        this.pollShitposts();
    },

    /*--- Define debug function ---*/

    debug: function(item) {
        var node = $('.test');
        var nodes = node.children();
        while (nodes.length >= 5) {
            nodes.first().remove();
            nodes = node.children();
        }
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
            context: this,
            data: {
                func: 'getShitposts',
                vars: {
                    lastID: this.lastID,
                    user: this.GetURLParameter('user'),
                    page: this.GetURLParameter('page'),
                    postsPerPage: this.postsPerPage
                }
            }
        }).done(function(data) {
            var dataArray = $.parseJSON(data);

            if (data['Error']) {
                this.debug(data['Error']);
            }

            // If no new posts are returned, abort
            if (dataArray['resultsArray'].length == 0) return;
            this.lastID = dataArray['resultsArray'][0]['shitID'];

            // Use returned JSON value 'totalPages' to build pagination if different than current totalPages
            // or if the returned page is different from current
            var newTotalPages = Number(dataArray['totalPages']);
            var newPage = Number(dataArray['page']);
            var isNewPage = ((this.page !== newPage) || this.isFirstBuild);
            this.isFirstBuild = false;

            var node;
            if ((this.totalPages !== newTotalPages) || isNewPage) {
                this.page = newPage;
                node = $('.pagination');
                this.buildPaginationView(newTotalPages, node);
            }
            // Use returned JSON to build html for shitpost entries
            node = $('.shitEntries');
            this.buildShitpostEntriesView(dataArray['resultsArray'],node,isNewPage);
        });
    },

    buildPaginationView: function(total,node) {
        var halfSpan = (this.span - 1)/2;
        var first = this.page - halfSpan;
        var final = this.page + halfSpan;
        if (first < 0) {
            first = 0;
            final = this.span-1;
            final = (final > (total-1)) ? (total-1) : final;
        }
        if (final > (total-1)) {
            final = total-1;
            first = final-(this.span-1);
            first = (first < 0) ? 0 : first;
        }

        // Erase node contents
        node.empty();
        // Build First and Previous page buttons
        var obj = this;
        var page = this.page;
        if (page > 0) {
            // Build First page button
            $('<div class="pageButton firstPage">&lt;&lt;</div>').appendTo(node);
            $('.firstPage').click(function() {
                page = 0;
                obj.updateURL({'page':page});
                obj.lastID = -1;
                obj.getShitposts();
            });
            // Build Previous page button
            $('<div class="pageButton prevPage">&lt;</div>').appendTo(node);
            $('.prevPage').click(function() {
                page -= 1;
                obj.updateURL({'page':page});
                obj.lastID = -1;
                obj.getShitposts();
            });
        }

        // Build elipsis to show pages exist before first displayed page
        if (first > 0) {
            $('<div class="pageElipsis">...</div>').appendTo(node);
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
                        obj.lastID = -1;
                        obj.getShitposts();
                    }
                }(p));
            }
        }

        // Build elipsis to show pages exist after last displayed page
        if (final < (total-1)) {
            $('<div class="pageElipsis">...</div>').appendTo(node);
        }

        // Build Next and Final page buttons
        if (page < final) {
            // Build Next page button
            $('<div class="pageButton nextPage">&gt;</div>').appendTo(node);
            $('.nextPage').click(function() {
                page += 1;
                obj.updateURL({'page':page});
                obj.lastID = -1;
                obj.getShitposts();
            });
            // Build Last page button
            $('<div class="pageButton lastPage">&gt;&gt;</div>').appendTo(node);
            $('.lastPage').click(function() {
                page = total-1;
                obj.updateURL({'page': page});
                obj.lastID = -1;
                obj.getShitposts();
            });
        }
    },

    buildShitpostEntriesView: function(shitpostArray,node,isNewPage) {
        // Erase node contents
        if (isNewPage) node.empty();
        shitpostArray.reverse();
        var newDate = null;
        var nodes;
        var content = '';

        $.each(shitpostArray, function(i,shitpostData) {
            nodes = node.children();
            if (!isNewPage) nodes.last().remove();
            var ID = 'post' + shitpostData['shitID'];
            content =
                '<div id='+ID+' class="Entry">' +
                    '<div class="Date '+ID+'">'+shitpostData['shitDate']+'</div>' +
                    '<div class="Content '+ID+'">' +
                        '<div class="Stamp '+ID+'">' +
                            '<div class="Time '+ID+'">'+shitpostData['shitTime']+'</div>' +
                            '<div class="User '+ID+'">'+shitpostData['shitUser']+'</div>' +
                        '</div>' +
                        '<div class="Shitpost '+ID+'">'+shitpostData['shitPost']+'</div>' +
                    '</div>' +
                '</div>';
            if (newDate !== shitpostData['shitDate']) {
                newDate = shitpostData['shitDate'];
            } else {
                $('.Date, .'+ID).hide();
            }
            $(node).prepend(content);
        });
        $('.Date, .'+this.lastID).hide();
        var temp = shitpostArray[shitpostArray.length-1];
        this.lastID = temp['shitID'];
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
        var obj = this;
        $('.submitButton').click(function () {
            var newShitpost = $('textarea[name="newEntry"]').val();
            if ((newShitpost === null) || (newShitpost === '')) {
                $(".error").text('Empty shitposts not allowed!');
            } else {
                $.ajax({
                    type: 'POST',
                    url: 'http://localhost/ShitpostController.php',
                    context: obj,
                    data: {
                        func: 'createShitpost',
                        vars: {
                            user: obj.GetURLParameter('user'),
                            shitpost: newShitpost
                        }
                    }
                }).done(function (data) {
                    if (data['Error']) {
                        obj.debug(data['Error']);
                    }
                    $(".error").empty();
                    $('textarea').val('');
                    if (this.page != 0) {
                        obj.updateURL({page: 0});
                        obj.lastID = -1;
                    }
                    obj.getShitposts();
                });
            }
        });
    }
};