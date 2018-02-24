$(function() {

    function debug(item) {
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
    }

    function GetURLParameter(param) {
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
    }

    function updateURL(newParams) {
        if (history.pushState) {
            var newUrl = window.location.pathname + '?';

            var oldParams = GetURLParameter();
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
    }

    // Define helper functions
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function pollShitposts() {
        while (1) {
            await sleep(2000);
            getShitposts();
        }
    }

    function getShitposts() {
        $.ajax({
            type: 'POST',
            url: 'http://localhost/ShitpostEntries.php',
            context: document,
            data: {
                user: GetURLParameter('user'),
                page: GetURLParameter('page'),
                postsPerPage: postsPerPage
            }
        }).done(function(data) {
            //debug(data);
            var dataArray = $.parseJSON(data);
            page = Number(dataArray['page']);
            //debug('current page: ' + page);

            // Use returned JSON value 'totalPages' to build pagination
            var node = $('.pagination');
            buildPagination(dataArray['totalPages'],node);

            // Use returned JSON to build html for shitpost entries
            node = $('.shitEntries');
            buildShitpostEntries(dataArray['resultsArray'],node);

        });
    }

    function buildPagination(total,node) {
        var first = ((page - span) > 0) ? (page - span) : 0;
        var final = ((page + span) < total ) ? (page + span) : (total-1);
        // Erase node contents
        node.empty();
        // Build First and Previous page buttons
        if (page > 0) {
            // Build First page button
            $('<div id="firstPage" class="pageButton">&lt;&lt;</div>').appendTo(node);
            $('#firstPage').click(function() {
                page = 0;
                updateURL({'page':page});
                getShitposts();
            });
            // Build Previous page button
            $('<div id="prevPage" class="pageButton">&lt;</div>').appendTo(node);
            $('#prevPage').click(function() {
                page -= 1;
                updateURL({'page':page});
                getShitposts();
            });
        }
        // Build the page buttons over twice the span
        for(var p = first; p <= final; p++) {
            var desiredID = 'page' + p;
            if (page == p) {
                $('<div id="' + desiredID + '" class="pageCurrent">' + (p + 1) + '</div>').appendTo(node);
            } else {
                $('<div id="' + desiredID + '" class="pageButton">' + (p + 1) + '</div>').appendTo(node);
                $('#' + desiredID).click(function(p) {
                    return function () {
                        updateURL({'page':p})
                        getShitposts();
                    }
                }(p));
            }
        }
        if (page < final) {
            // Build Next page button
            $('<div id="nextPage" class="pageButton">&gt;</div>').appendTo(node);
            $('#nextPage').click(function() {
                page += 1;
                updateURL({'page':page});
                getShitposts();
            });
            // Build Last page button
            $('<div id="lastPage" class="pageButton">&gt;&gt;</div>').appendTo(node);
            $('#lastPage').click(function() {
                updateURL({'page': final});
                getShitposts();
            });
        }
    }

    function buildShitpostEntries(shitpostArray,node) {
        // Erase node contents
        node.empty();
        $.each(shitpostArray, function(i,shitpostData) {
            var ID = 'post' + shitpostData['shitID'];
            var content =
            '<div id="'+ID+'" class="Date">'+shitpostData['shitDate']+'</div>' +
            '<div id="'+ID+'" class="Entry">' +
                '<div id="'+ID+'" class="Stamp">' +
                    '<div id="'+ID+'" class="Time">'+shitpostData['shitTime']+'</div>' +
                    '<div id="'+ID+'" class="User">'+shitpostData['shitUser']+'</div>' +
                '</div>' +
                '<div id="'+ID+'" class="Shitpost">'+shitpostData['shitPost']+'</div>' +
            '</div>';
            $(content).appendTo(node);
        });
    }


    var span = 4;
    var postsPerPage = 25;
    var page = 0;

    // Replace with actual login stuff
    var user = 'D'; // Temporary user set


    var testParams = {
        user: user,
        page: page
    };
    updateURL(testParams);


    var node = $('.main');
    var content =
        '<div class="newEntry">' +
            '<div>' +
                '<div class="userBar">User: '+user+'</div>' +
                '<div>' +
                    '<textarea name="newEntry" rows="8" cols="80"></textarea><br>' +
                    '<span class="error"></span><br>' +
                '</div>' +
                '<div class="submitButton">SHITPOST!</div>' +
            '</div>' +
        '</div>';
    $(content).appendTo(node);

    $('.submitButton').click(function () {
        var newShitpost = $('textarea[name="newEntry"]').val();
        if ((newShitpost === null) || (newShitpost === '')) {
            $(".error").text('Empty shitposts not allowed!');
        } else {
            $.ajax({
                type: 'POST',
                url: 'http://localhost/NewShitpostEntry.php',
                context: document,
                data: {
                    user: GetURLParameter('user'),
                    shitpost: newShitpost
                }
            }).done(function (data) {
                $(".error").empty();
                $('textarea').val('');
                updateURL({page: 0});
                getShitposts();
            });
        }
    });

    getShitposts();
    pollShitposts();
});

