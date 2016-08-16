$(document).ready(function() {
    $('.button-collapse').sideNav({
        closeOnClick: true
    });
    $('.button-collapse-right').sideNav({
        edge: 'right',
        closeOnClick: true
    });
    $('.modal-trigger').leanModal();
    $('.dropdown').dropdown();
    $('.hideable-content').on('DOMSubtreeModified', function () {
        if ($(this).is(':empty')) {
            $(this).closest('.hideable').addClass('hide');
        } else {
            $(this).closest('.hideable').removeClass('hide');
        }
    });
});

function getQueryString(field, isArray = false) {
    var target = window.location.href;
    var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'ig');

    var values = [];
    do {
        var matches = reg.exec(target);
        if (matches) {
            values.push(matches[1]);
        }
    } while (matches);

    if (!values.length) {
        return null;
    } else {
        return isArray ? values : values[0];
    }
}

function getQueryStringWithStorageBacking(field, defaultVal, isArray = false) {
    var val = getQueryString(field, isArray);
    if (val === null && sessionStorage.getItem(field)) {
        try {
            val = JSON.parse(sessionStorage.getItem(field));
        } catch (ex) {
            console.warn("Failed to retrieve value of '%s' in sessionStorage. Error: %s", field, ex);
        }
    }

    if (val === null) {
        val = defaultVal;
    }

    trySaveToSessionStorage(field, JSON.stringify(val));

    return val;
}

function trySaveToSessionStorage(field, stringVal) {
    try {
        sessionStorage.setItem(field, stringVal);
    } catch (ex) {
        console.warn("Failed to save value of '%s' in sessionStorage. Error: %s", field, ex);
    }
}

function showBusy(text) {
    $('#busy-message').text(text);
    $('#busy-dialog').openModal({
        dismissible: false
    });
}

function hideBusy() {
    $('#busy-dialog').closeModal();
}

function showConfirmation(title, icon, message, yesCallback) {
    $('#confirmation-title').text(title);
    $('#confirmation-image').text(icon);
    $('#confirmation-message').text(message);
    $('#confirmation-yes')[0].onclick = yesCallback;
    $('#confirmation-dialog').openModal();
}

const API_BASE_PATH = '/api/v1';

function getAsync(url, data = null) {
    return $.ajax({
        url: url,
        method: 'GET',
        contentType: 'application/json',
        dataType: 'json',
        data: data
    });
}

function putAsync(url, data) {
    return $.ajax({
        url: url,
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: data
    });
}

function postAsync(url, data) {
    return $.ajax({
        url: url,
        method: 'POST',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: data
    });
}

function deleteAsync(url) {
    return $.ajax({
        url: url,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text'
    });
}

function getRecipesAsync(searchFilter) {
    return getAsync(API_BASE_PATH + '/recipes', searchFilter);
}

function getRecipeAsync(recipeId) {
    return getAsync(API_BASE_PATH + '/recipes/' + recipeId);
}

function postRecipeAsync(recipe) {
    return postAsync(API_BASE_PATH + '/recipes', JSON.stringify(recipe));
}

function putRecipeAsync(recipe) {
    return putAsync(API_BASE_PATH + '/recipes/' + recipe.id, JSON.stringify(recipe));
}

function deleteRecipeAsync(recipeId) {
    return deleteAsync(API_BASE_PATH + '/recipes/' + recipeId);
}

function getRecipeMainImageAsync(recipeId) {
    return getAsync(API_BASE_PATH + '/recipes/' + recipeId + '/image');
}

function putRecipeMainImageAsync(recipeId, imageId) {
    return putAsync(API_BASE_PATH + '/recipes/' + recipeId + '/image', imageId);
}

function getRecipeImagesAsync(recipeId) {
    return getAsync(API_BASE_PATH + '/recipes/' + recipeId + '/images');
}

function postRecipeImageAsync(recipeId, imageFormData) {
    return $.ajax({
        url: API_BASE_PATH + '/recipes/' + recipeId + '/images',
        method: 'POST',
        enctype: 'multipart/form-data',
        contentType: false,
        dataType: 'text',
        processData: false,
        data: imageFormData
    });
}

function deleteImageAsync(imageId) {
    return deleteAsync( API_BASE_PATH + '/images/' + imageId);
}

function getRecipeNotesAsync(recipeId) {
    return getAsync( API_BASE_PATH + '/recipes/' + recipeId + '/notes');
}

function postNoteAsync(note) {
    return postAsync(API_BASE_PATH + '/notes', JSON.stringify(note));
}

function putNoteAsync(note) {
    return putAsync(API_BASE_PATH + '/notes/' + note.id, JSON.stringify(note));
}

function deleteNoteAsync(noteId) {
    return deleteAsync(API_BASE_PATH + '/notes/' + noteId);
}

function putRecipeRatingAsync(recipeId, rating) {
    return putAsync(API_BASE_PATH + '/recipes/' + recipeId + '/rating', rating);
}

function getTagsAsync(tagsFilter) {
    return getAsync(API_BASE_PATH + '/tags', tagsFilter);
}
