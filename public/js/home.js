$(document).ready(function () {
    var recipeLists = [
        { title: 'Recipes', tags: [] },
        { title: 'Beef', tags: ['beef', 'steak'] },
        { title: 'Poultry', tags: ['chicken', 'turkey', 'poultry'] },
        { title: 'Pork', tags: ['pork'] },
        { title: 'Seafood', tags: ['seafood', 'fish'] },
        { title: 'Pasta', tags: ['pasta'] },
        { title: 'Vegetarian', tags: ['vegetarian'] },
        { title: 'Sides', tags: ['side', 'sides'] },
        { title: 'Drinks', tags: ['drink', 'cocktail'] }
    ];
    recipeLists.forEach(function (data) {
        var $wrapper = $('\
            <article class="col s12 l12">\
                <h5>' + data.title + '</h5>\
            </article>');
        var $container = $('\
            <div>\
                <div class="progress">\
                    <div class="indeterminate"></div>\
                </div>\
            </div>');
        $wrapper.append($container);
        $('#recipes-container').append($wrapper)
        loadRecipes($container, data.title, {
            q: '',
            tags: data.tags,
            sort: 'random',
            dir: 'asc',
            page: 1,
            count: 6
        });
    });
});

function loadRecipes($container, title, searchFilter) {
    getRecipesAsync(searchFilter).done(function (response) {
        $container.empty();

        if (response.recipes !== null) {
            response.recipes.forEach(function (recipe) {
                var $recipeWrapper = $('<div class="col s6 m4 l2"></div>');
                appendRecipeCard($recipeWrapper, recipe, 'tiny');
                $container.append($recipeWrapper);
            });
            var link = '/recipes?q=';
            if (searchFilter.tags.length === 0) {
                link += '&tags=';
            } else {
                searchFilter.tags.forEach(function (tag) {
                    link += '&tags=' + tag;
                });
            }
            $container.append('\
                <a class="right" href="' + link + '">\
                    ' + title + ' (' + response.total + ') &gt;&gt;\
                </a>');
        }
    });
}