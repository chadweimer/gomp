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
