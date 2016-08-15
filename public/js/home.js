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
    getRecipesAsync('{{RootUrlPath}}', searchFilter).done(function (response) {
        $container.empty();

        if (response.recipes !== null) {
            response.recipes.forEach(function (recipe) {
                var $recipeWrapper = $('\
                    <div class="col s6 m4 l2"></div>');
                var $recipeContent = '\
                    <div class="card tiny grey lighten-4 hoverable clickable"\
                        onclick="location.href = \'{{RootUrlPath}}/recipes/' + recipe.id + '\';"\
                        title="' + recipe.name + '">';
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
            var link = '{{RootUrlPath}}/recipes?q=';
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