$(document).ready(function() {
    recipeId = NaN;
    var path = window.location.pathname;
    var recipeIdMatch = path.match(/\/recipes\/(\d+)\/edit/);
    if (recipeIdMatch) {
        recipeId = parseInt(recipeIdMatch[1], 10);
    }

    if(!isNaN(recipeId)) {
        $('#action-text').text('Edit');
        loadRecipe();
    } else {
        initTags([]);
    }

    loadSuggestedTags();
});

function loadRecipe() {
    showBusy('Loading recipe...');
    getRecipeAsync(recipeId).done(function(recipe) {
        $('#name').val(recipe.name);
        $('#serving-size').val(recipe.servingSize);
        $('#serving-size').trigger('autoresize');
        $('#ingredients').val(recipe.ingredients);
        $('#ingredients').trigger('autoresize');
        $('#directions').val(recipe.directions);
        $('#directions').trigger('autoresize');
        $('#nutrition-info').val(recipe.nutritionInfo);
        $('#nutrition-info').trigger('autoresize');
        $('#source').val(recipe.sourceUrl);

        var tagsData = [];
        if (recipe.tags !== null) {
            recipe.tags.forEach(function(tag) {
                tagsData.push({tag: tag});
            });
        }
        initTags(tagsData);
    }).always(function() {
        hideBusy();
    });
}

function initTags(initialTags) {
    var $tagDiv = $('#tags');
    var $tagChips = $tagDiv.find('.chips');
    $tagChips.material_chip({
        data: initialTags,
        placeholder: '+tag',
        secondaryPlaceholder: '+tag'
    });
    $tagChips.find('.chip').each(function() {
        $tagDiv.append('<input name="tags" type="hidden" value="' + $(this).contents().first().text() + '">');
    });
    $tagChips.on('chip.add', function(e, chip) {
        $tagDiv.append('<input name="tags" type="hidden" value="' + chip.tag + '">');
    });
    $tagChips.on('chip.delete', function(e, chip) {
        $tagDiv.find('input[value="' + chip.tag + '"]').remove();
    });

    var $tagInput = $tagDiv.find('.chips > input');
    $tagInput.keyup(function(){
        this.value = this.value.toLowerCase();
    });
    $tagInput.after('<label class="active">Tags</label>');
}

function loadSuggestedTags() {
    var $suggestedTagsContainer = $('#suggested-tags-container');
    getTagsAsync({
        sort: "frequency",
        dir: "desc",
        count: 12
    }).done(function(tags){
        if (tags !== null) {
            tags.forEach(function(tag){
                $suggestedTagsContainer.append('\
                    <span class="chip green lighten-5 green-text text-darken-4" data-tag="' + tag + '">\
                        ' + tag + '<i class="material-icons close" onclick="suggestedTagClicked(this, event);">add</i>\
                    </span>');
            });
        }
    });
}

function suggestedTagClicked(self, e) {
    e.preventDefault();

    var $tagInput = $('#tags .chips > input');
    var tagData = $(self).closest('.chip').data('tag');
    $tagInput.val(tagData);
    var ke = $.Event('keydown');
    ke.which = 13;
    ke.keyCode = 13;
    $tagInput.trigger(ke);
}

function onSaveRecipeClicked(self, e) {
    e.preventDefault();

    var name = $('#name').val();
    var servingSize = $('#serving-size').val();
    var ingredients = $('#ingredients').val();
    var directions = $('#directions').val();
    var nutritionInfo = $('#nutrition-info').val();
    var sourceUrl = $('#source').val();
    var tags = [];
    $('#recipe-form input[name="tags"]').each(function() {
        tags.push($(this).val());
    });

    if (!isNaN(recipeId)) {
        putRecipeAsync({
            id: recipeId,
            name: name,
            servingSize: servingSize,
            ingredients: ingredients,
            directions: directions,
            nutritionInfo: nutritionInfo,
            sourceUrl: sourceUrl,
            tags: tags
        }).done(function() {
            window.location = '/recipes/' + recipeId;
        });
    } else {
        postRecipeAsync({
            name: name,
            servingSize: servingSize,
            ingredients: ingredients,
            directions: directions,
            nutritionInfo: nutritionInfo,
            sourceUrl: sourceUrl,
            tags: tags
        }).done(function(data, textStatus, request) {
            var location = document.createElement('a');
            location.href = request.getResponseHeader('Location');
            var path = location.pathname;

            var newRecipeId = NaN;
            var newRecipeIdMatch = path.match(/\/api\/v1\/recipes\/(\d+)/);
            if (newRecipeIdMatch) {
                newRecipeId = parseInt(newRecipeIdMatch[1], 10);
            }
            window.location = '/recipes/' + newRecipeId;
        });
    }
}