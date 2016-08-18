$(document).ready(function(){
    pageNum = parseInt(getQueryString('page'), 10);
    if (pageNum === null || isNaN(pageNum)) {
        pageNum = 1;
    }

    query = getQueryStringWithStorageBacking('q', '');
    searchTags = getQueryStringWithStorageBacking('tags', [], true).filter(v => v !== '');
    sortBy = getQueryStringWithStorageBacking('sort', 'name');
    sortDir = getQueryStringWithStorageBacking('dir', 'asc');
    viewMode = getQueryStringWithStorageBacking('view', 'full');

    loadRecipes();
    loadTags(searchTags);
});

function onResetClicked(self, e) {
    e.preventDefault();

    sessionStorage.clear();
    pageNum = 1;
    query = '';
    searchTags = [];
    sortBy = 'name';
    sortDir = 'asc';
    viewMode = 'full';

    loadRecipes();
    loadTags(searchTags);
}

function onChangeViewClicked(self, e) {
    e.preventDefault();

    viewMode = $(self).data('mode');
    trySaveToSessionStorage('view', JSON.stringify(viewMode));

    loadRecipes();
}

function onChangeSortClicked(self, e) {
    e.preventDefault();

    var newSortBy = $(self).data('sort');
    if (sortBy === newSortBy) {
        sortDir = (sortDir === 'asc' ? 'desc' : 'asc');
    } else {
        sortBy = newSortBy;
        sortDir = $(self).data('dir');
    }
    trySaveToSessionStorage('sort', JSON.stringify(sortBy));
    trySaveToSessionStorage('dir', JSON.stringify(sortDir));

    loadRecipes();
}

function onPaginationClicked(self, e) {
    e.preventDefault();

    pageNum = parseInt($(self).data('page'), 10);
    if (pageNum === null || isNaN(pageNum)) {
        pageNum = 1;
    }

    loadRecipes();
}

function onApplyTagsClicked(self, e) {
    e.preventDefault();

    var checkedTags = [];
    $('#tag-filter-list input[name="tags"]:checked').each(function() {
        checkedTags.push($(this).val());
    })
    searchTags = checkedTags;
    trySaveToSessionStorage('tags', JSON.stringify(searchTags));

    loadRecipes();
    loadTags(searchTags);
}

function loadRecipes() {
    showBusy('Loading recipes...');

    $('#search-query').text(query);
    $('.view-mode').removeClass('active');
    $('.view-mode.' + viewMode).addClass('active');
    $('.sort').removeClass('active');
    $('.sort.' + sortBy).addClass('active');
    
    var $container = $('.recipes-container');

    var count = (viewMode !== 'compact' ? 12 : 60);
    getRecipesAsync({
        q: query,
        tags: searchTags,
        sort: sortBy,
        dir: sortDir,
        page: pageNum,
        count: count
    }).done(function(response) {
        $('html, body').animate({scrollTop: 0});
        $('#result-count').text(response.total);

        $container.empty();

        if (response.recipes !== null) {
            if (viewMode !== 'compact') {
                addRecipesFull($container, response.recipes);
            } else {
                addRecipesCompact($container, response.recipes);
            }
        }

        var numPages = Math.ceil(response.total / count);
        addPaginiation(pageNum, numPages);
    }).always(function() {
        hideBusy();
    });
}

function addRecipesFull($container, recipes) {
    recipes.forEach(function(recipe) {
        var $recipeWrapper = $('\
            <div class="col s12 m6 l4"></div>');
        var $recipeContent = '\
            <div class="card small grey lighten-4 hoverable clickable"\
                onclick="location.href = \'/recipes/' + recipe.id + '\';"\
                title="' + recipe.name +'">';
        if (recipe.mainImage.thumbnailUrl !== '') {
            $recipeContent += '\
                <div class="card-image">\
                    <img src="' + recipe.mainImage.thumbnailUrl + '" class="darken-10">\
                </div>';
        }
        $recipeContent += '\
                <div class="rating-container">\
                    <span class="star whole" data-rating="5"><i class="material-icons">star</i></span>\
                    <span class="star half" data-rating="4.5"><i class="material-icons">star</i></span>\
                    <span class="star whole" data-rating="4"><i class="material-icons">star</i></span>\
                    <span class="star half" data-rating="3.5"><i class="material-icons">star</i></span>\
                    <span class="star whole" data-rating="3"><i class="material-icons">star</i></span>\
                    <span class="star half" data-rating="2.5"><i class="material-icons">star</i></span>\
                    <span class="star whole" data-rating="2"><i class="material-icons">star</i></span>\
                    <span class="star half" data-rating="1.5"><i class="material-icons">star</i></span>\
                    <span class="star whole" data-rating="1"><i class="material-icons">star</i></span>\
                    <span class="star half" data-rating="0.5"><i class="material-icons">star</i></span>\
                </div>\
                <div class="card-content truncate">\
                    <span class="card-title">' + recipe.name + '</span>\
                </div>\
            </div>';
        $recipeWrapper.append($recipeContent);
        $container.append($recipeWrapper);
        $recipeWrapper.find('.star[data-rating="' + recipe.averageRating + '"]').addClass('active');
    });
}

function addRecipesCompact($container, recipes) {
    var columnizedRecipes = splitArray(recipes, 4);
    columnizedRecipes.forEach(function(innerRecipes) {
        var $innerContainer = $('<div class="col s12 m6 l3"></div>');
        $container.append($innerContainer);

        innerRecipes.forEach(function(recipe) {
            var $recipeWrapper = $('\
                <div class="col s12 l12"></div>');
            var $recipeContent = '\
                <a href="/recipes/' + recipe.id + '" class="truncate" title="' + recipe.name + '">\
                    <img class="compact-image circle">\
                    <span>' + recipe.name + '</span>\
                </a>';
            $recipeWrapper.append($recipeContent);
            $innerContainer.append($recipeWrapper);
            if (recipe.mainImage.thumbnailUrl !== '') {
                $recipeWrapper.find('img').attr('src', recipe.mainImage.thumbnailUrl);
            }
        });
    });
}

function addPaginiation(pageNum, numPages) {
    var prevPageNum = pageNum - 1;
    var nextPageNum = pageNum + 1;
    $('.pagination-container').html('\
        <ul class="pagination center grow">\
            <li class="' + (pageNum === 1 ? 'disabled' : '') + '">\
                <a href="#!" onclick="onPaginationClicked(this, event);" data-page="1">\
                    <i class="material-icons">first_page</i>\
                </a>\
            </li>\
            <li class="' + (pageNum === 1 ? 'disabled' : '') + '">\
                <a href="#!" onclick="onPaginationClicked(this, event);" data-page="' + prevPageNum + '">\
                    <i class="material-icons">chevron_left</i>\
                </a>\
            </li>\
            <li class="active">\
                <a href="#!">' + pageNum + '</a>\
            </li>\
            <li class="' + (pageNum === numPages ? 'disabled' : '') + '">\
                <a href="#!" onclick="onPaginationClicked(this, event);" data-page="' + nextPageNum + '">\
                    <i class="material-icons">chevron_right</i>\
                </a>\
            </li>\
            <li class="' + (pageNum === numPages ? 'disabled' : '') + '">\
                <a href="#!" onclick="onPaginationClicked(this, event);" data-page="' + numPages + '">\
                    <i class="material-icons">last_page</i>\
                </a>\
            </li>\
        </ul>');
}

function loadTags(searchTags) {
    getTagsAsync({
        sort: "tag",
        dir: "asc",
        count: Number.MAX_SAFE_INTEGER
    }).done(function(tags){
        var $container = $('#tag-filter-list');
        $container.empty();
        if (tags !== null) {
            tags.forEach(function(tag){
                $container.append('\
                <li>\
                    <input id="' + tag + '-tag" name="tags" type="checkbox" value="' + tag + '"' + (searchTags.includes(tag) ? ' checked' : '') + '>\
                    <label for="' + tag + '-tag">' + tag + '</label>\
                </li>');
            });
        }
    });
}

function splitArray(items, numSplits) {
    var splitCount = Math.ceil(items.length / numSplits)

    var newArrays = [[]];
    var index = 0

    for (i = 0; i < items.length; i++) {
        if (i >= (index + 1) * splitCount) {
            newArrays.push([]);
            index++;
        }
        newArrays[index].push(items[i]);
    }

    return newArrays;
}
