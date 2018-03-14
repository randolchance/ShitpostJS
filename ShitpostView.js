var ShitpostView = function() {
    this.init();
};

ShitpostView.prototype = {

    init: function() {

        var node = $('.main');
        this.buildLoginView(node);

    },

    /*--- Define debug function ---*/

    debug: function(item) {
        var node = $('.test');
        var nodes = node.children();
        while (nodes.length >= 20) {
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

    getCookieValue: function(param) {
        var pairs = document.cookie.split(';');
        var results = {};
        for (var i = 0; i < pairs.length; i++) {
            var pair = pairs[i].split('=');
            if (param) {
                if (param == pair[0]) return pair[1];
            } else {
                results[pair[0]] = pair[1];
            }
        }
        if (param) return '';
        else return results;
    },

    setCookieParam: function(dict) {
        $.each(dict, function(key,value) {
            var getValue = this.getCookieValue(key);
            if (getValue) {
                document.cookie = document.cookie.replace(getValue, value);
                return true;
            } else {
                document.cookie = key + '=' + value + '; ' + document.cookie;
                return false;
            }
        });
    },

    checkAlphanumeric: function(str) {
        return (str.search('([A-Za-z0-9]{' + str.length + '})') != -1);
    },

    checkEmail: function(str) {
        var regex = '^(([^<>()\\[\\]\\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(".+"))';
        regex += '@';
        regex += '((\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$';
        return (str.search(regex) != -1);
    },

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


    getLastPostID: function() {
        var node = $('.Entry').first();
        return node.attr('id');
    },

    getLastPostDate: function() {
        return $('.Date.'+this.getLastPostID()).text();
    },


    /*--- Define general operation function ---*/

    operate: function() {

        // span must be odd
        this.span = 9;
        this.postsPerPage = 100;
        this.page = 0;
        this.lastID = -1;
        this.totalPages = null;
        this.isFirstBuild = true;
        this.maxShitpostChars = 300;

        this.updateURL({
            page: this.page
        });

        var node = $('.header');
        //this.buildHeaderView(node);

        node = $('.main');
        this.buildNewShitpostEntryView(node);
        var content =
            '<div class="pagination"></div>' +
            '<div class="shitEntries"></div>' +
            '<div class="pagination"></div>';
        $(content).appendTo(node);

        this.getShitposts();
        this.pollShitposts();
    },


    /*--- Define communcation protocol to PHP controller ---*/

    getShitposts: function() {
        var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        $.ajax({
            type: 'POST',
            url: './ShitpostController.php',
            context: this,
            data: {
                func: 'getShitposts',
                vars: {
                    lastID: this.lastID,
                    user: this.user,
                    page: this.GetURLParameter('page'),
                    postsPerPage: this.postsPerPage,
                    timezone: timezone
                }
            }
        }).done(function(data) {
            var dataArray = $.parseJSON(data);

            if (dataArray['Error']) {
                this.debug(dataArray['Error']);
            }
            if (!dataArray['verified']) {
                this.completeLogout();
            }

            // If no new posts are returned, abort
            if (dataArray['resultsArray'].length == 0) return;
            if (this.lastID >= dataArray['resultsArray'][0]['shitID']) return;
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
            this.buildShitpostEntriesView(dataArray['resultsArray'], node, isNewPage);
            dataArray['resultsArray'] = [];
        });
    },


    /*--- Define logout function ---*/

    completeLogout: function() {
        window.location.replace("./index.html");
    },


    /*--- Define view-building functions ---*/

    buildLoginView: function(node) {
        // Build form content
        var content =
            '<div class="login">' +
                '<div class="userBlock">' +
                    '<span class="user">User: </span><input id="userField" type="text" name="usr">' +
                '</div>' +
                '<div class="passwordBlock">' +
                    '<span class="password">Password: </span><input id="passwordField" type="password" name="password">' +
                '</div>' +
                '<span class="error"></span><br>' +
                '<button id="loginButton" class="submitButton">LOGIN</button>' +
            '</div>';
        // Attach content
        $(content).appendTo(node);
        $('#userField').focus();

        // Add button functionality here
        var obj = this;
        $('#loginButton').click(function () {
            var tryUser = $('#userField').val();
            var tryPassword = $('#passwordField').val();
            if ((tryUser === null) || (tryUser === '')) {
                $(".error").text('Please enter a user name.');
                $('#userField').focus();
            } else if (!obj.checkAlphanumeric(tryUser)) {
                $(".error").text('User name should be entirely alphanumeric.');
                $('#userField').focus();
            } else if ((tryPassword === null) || (tryPassword === '')) {
                $(".error").text('Please enter a password.');
                $('#passwordField').focus();
            } else if (!obj.checkAlphanumeric(tryPassword)) {
                $(".error").text('Password should be entirely alphanumeric.');
                $('#passwordField').focus();
            } else {
                $.ajax({
                    type: 'POST',
                    url: './ShitpostController.php',
                    context: obj,
                    data: {
                        func: 'attemptLogin',
                        vars: {
                            user: tryUser,
                            password: tryPassword
                        }
                    }
                }).done(function (data) {
                    var dataArray = $.parseJSON(data);
                    if (dataArray['Error']) {
                        this.debug(dataArray['Error']);
                    }
                    if (!dataArray['verified']) {
                        $(".error").text('Invalid login.');
                    } else {
                        this.user = dataArray['user'];
                        $('.main').empty();
                        this.operate();
                    }
                });
            }
        });
    },
    /*
    buildHeaderView: function(node) {
        var content =
            '<div class="settings">settings</div>' +
            '<div class="logout">logout</div>';
        $(content).appendTo(node);

        // Build header functionality
        var obj = this;
        $('.logout').click(function () {
            obj.completeLogout();
        });
        $('.settings').click(function () {
            var node = $('.main');
            node.empty();
            obj.buildSettingsView(node);
        });
    },

    buildSettingsView: function(node) {
        var content =
            '<div class="newSettings">' +
                '<div class="userBlock">' +
                    '<span class="user">Current user name: ' + this.user + '</span>' +
                    '<span class="user">New user name: </span><input id="userField" type="text" name="usr" value="' + this.user + '">' +
                '</div>' +
                '<div class="passwordBlock">' +
                    '<span class="password">Old Password: </span><input id="oldPasswordField" type="password">' +
                    '<span class="password">New Password: </span><input id="newPasswordField" type="password">' +
                    '<span class="password">Confirm New Password: </span><input id="confirmPasswordField" type="password">' +
                '</div>' +
                '<span class="error"></span><br>' +
                '<div id="changeButton" class="submitButton">CHANGE</div>' +
            '</div>';
    },
    */
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

    correctShitpostOverflow: function(shitpostID) {
        var ID = '.Shitpost '+shitpostID;
        if ($(ID)[0].scrollWidth >  $(ID).innerWidth()) {
            var shitpost = $(ID).text();

        }
    },

    buildShitpostEntriesView: function(shitpostArray,node,isNewPage) {
        // Erase node contents
        if (isNewPage) node.empty();
        shitpostArray.reverse();
        var newDate = null;
        var oldID = null;
        var nodes;
        var content = '';

        if (!isNewPage) {
            if (shitpostArray[0]['shitDate'] == this.getLastPostDate()) $('.Date.'+this.getLastPostID()).hide();
        }
        var obj = this;
        $.each(shitpostArray, function(i,shitpostData) {
            nodes = node.children();
            if (!isNewPage && (nodes.length >= obj.postsPerPage)) nodes.last().remove();
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
            $(node).prepend(content);
            if (newDate == null) {
                newDate = shitpostData['shitDate'];
            }
            if ((newDate != shitpostData['shitDate'])) {
                newDate = shitpostData['shitDate'];
                $('.Date.'+oldID).show();
            }
            $('.Date.'+ID).hide();
            oldID = ID;
        });
        $('.Date.'+oldID).show();
        var temp = shitpostArray[shitpostArray.length-1];
        this.lastID = temp['shitID'];
    },

    remove_xss: function(text) {
        var regex = /<script.+<\/script>/g;
        text = text.replace(regex, '');
        regex = /<form.+<\/form>/g;
        text = text.replace(regex, '');
        return text;
    },

    buildNewShitpostEntryView: function(node) {
        /*-- Build form content --*/
        var content =
            '<div class="newEntry">' +
                '<div>' +
                    '<div class="userBar">' +
                        '<div>User: '+this.user+'</div><div id="shitpostCharsLeft">'+this.maxShitpostChars+'</div>' +
                    '</div>' +
                    '<div>' +
                        '<textarea name="newEntry" id="newEntry" rows="8" cols="80"></textarea><br>' +
                        '<span class="error"></span><br>' +
                    '</div>' +
                '<button class="submitButton">SHITPOST!</button>' +
            '</div>' +
            '</div>';
        // Attach content
        $(content).appendTo(node);

        /*-- Build form functionality --*/
        var obj = this;
        var textareaNode = $('textarea[name="newEntry"]');
        $(textareaNode).focus();

        // Build live character count functionality
        textareaNode.on("keyup keydown", function() {
            var shitpostCharsLeft = obj.maxShitpostChars - $(this).val().length;
            $('#shitpostCharsLeft').text(shitpostCharsLeft);
        });

        // Build shitpost submission functionality
        $('.submitButton').click(function () {
            var newShitpost = textareaNode.val();
            newShitpost = obj.remove_xss(newShitpost);
            if ((newShitpost === null) || (newShitpost === '')) {
                $(".error").text('Empty shitposts not allowed!');
                $(textareaNode).val('');
                $('#shitpostCharsLeft').text(obj.maxShitpostChars);
            } else if (newShitpost.replace(/\s+/g, '') == '') {
                $(".error").text('Empty shitposts not allowed!');
                $(textareaNode).val('');
                $('#shitpostCharsLeft').text(obj.maxShitpostChars);
            } else if (newShitpost.length > obj.maxShitpostChars) {
                $(".error").text('Post over length by ' + (newShitpost.length - obj.maxShitpostChars) + ' characters');
            } else {
                $(textareaNode).val('');
                $('#shitpostCharsLeft').text(obj.maxShitpostChars);
                $(textareaNode).focus();
                $.ajax({
                    type: 'POST',
                    url: './ShitpostController.php',
                    context: obj,
                    data: {
                        func: 'createShitpost',
                        vars: {
                            user: obj.user,
                            shitpost: newShitpost
                        }
                    }
                }).done(function (data) {
                    var dataArray = $.parseJSON(data);
                    if (dataArray['Error']) {
                        this.debug(data['Error']);
                    }
                    $(".error").empty();
                    if (this.page != 0) {
                        this.updateURL({page: 0});
                        this.lastID = -1;
                    }
                    this.getShitposts();
                });
            }
        });
    }
};