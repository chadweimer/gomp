
$(document).ready(function(){
    $('#mobile-menu-button').sideNav();
    $('.modal-trigger').leanModal();
    $('.dropdown').dropdown();
});

function getQueryString(field, isArray = false) {
    var target = window.location.href;
    var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'ig');

    var values = [];
    while(true) {
        var matches = reg.exec(target);
        if (matches) {
            values.push(matches[1]);
        } else {
            break;
        }
    }

    if (!values.length) {
        return null;   
    } else {
        return isArray ? values : values[0];
    }
}

function getQueryStringWithStorageBacking(field, defaultVal, isArray = false) {
    var val = getQueryString(field, isArray);
    if (val == null && sessionStorage.getItem(field)) {
        try {
            val = JSON.parse(sessionStorage.getItem(field));
        } catch(err) {
            // TODO: What should we do with this?
        }
    }

    if (val == null) {
        val = defaultVal;
    }

    trySaveToSessionStorage(field, JSON.stringify(val));

    return val;
}

function trySaveToSessionStorage(field, stringVal) {
    try {
        sessionStorage.setItem(field, stringVal);
    } catch (err) {
        // TODO: What should we do with this?
    }
}

function showBusy(text) {
    var $busyDialog = $('#busy-dialog');
    var $busyMessage = $('#busy-message').text(text);
    $busyDialog.openModal({
        dismissible: false,
    });
}

function hideBusy() {
    var $busyDialog = $('#busy-dialog');
    $busyDialog.closeModal();
}

function getRecipesAsync(rootUrlPath, searchFilter) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes',
        method: 'GET',
        contentType: 'application/json',
        dataType: 'json',
        data: searchFilter,
    });
}

function getRecipeAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId,
        method: 'GET',
        dataType: 'json',
    });
}

function postRecipeAsync(rootUrlPath, recipe) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify(recipe),
    });
}

function putRecipeAsync(rootUrlPath, recipe) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipe.id,
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify(recipe),
    });
}

function deleteRecipeAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text',
    });
}

function getRecipeMainImageAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/image',
        method: 'GET',
        dataType: 'json',
    });
}

function putRecipeMainImageAsync(rootUrlPath, recipeId, imageId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/image',
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: imageId,
    });
}

function getRecipeImagesAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/images',
        method: 'GET',
        dataType: 'json',
    });
}

function postRecipeImageAsync(rootUrlPath, recipeId, imageFormData) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/images',
        method: 'POST',
        enctype: 'multipart/form-data',
        contentType: false,
        dataType: 'text',
        processData: false,
        data: imageFormData,
    });
}

function deleteImageAsync(rootUrlPath, imageId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/images/' + imageId,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text',
    });
}

function getRecipeNotesAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes',
        method: 'GET',
        dataType: 'json',
    });
}

function postNoteAsync(rootUrlPath, note) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/notes',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify(note),
    });
}

function putNoteAsync(rootUrlPath, note) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/notes/' + note.id,
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify(note),
    });
}

function deleteNoteAsync(rootUrlPath, noteId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/notes/' + noteId,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text',
    });
}

function putRecipeRatingAsync(rootUrlPath, recipeId, rating) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/rating',
        method: 'PUT',
        dataType: 'json',
        processData: false,
        data: rating,
    });
}

function getTagsAsync(rootUrlPath, tagsFilter) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/tags',
        method: 'GET',
        contentType: 'application/json',
        dataType: 'json',
        data: tagsFilter,
    });
}
