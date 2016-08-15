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

function getRecipesAsync(rootUrlPath, searchFilter) {
    return getAsync(rootUrlPath + API_BASE_PATH + '/recipes', searchFilter);
}

function getRecipeAsync(rootUrlPath, recipeId) {
    return getAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId);
}

function postRecipeAsync(rootUrlPath, recipe) {
    return postAsync(rootUrlPath + API_BASE_PATH + '/recipes', JSON.stringify(recipe));
}

function putRecipeAsync(rootUrlPath, recipe) {
    return putAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipe.id, JSON.stringify(recipe));
}

function deleteRecipeAsync(rootUrlPath, recipeId) {
    return deleteAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId);
}

function getRecipeMainImageAsync(rootUrlPath, recipeId) {
    return getAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId + '/image');
}

function putRecipeMainImageAsync(rootUrlPath, recipeId, imageId) {
    return putAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId + '/image', imageId);
}

function getRecipeImagesAsync(rootUrlPath, recipeId) {
    return getAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId + '/images');
}

function postRecipeImageAsync(rootUrlPath, recipeId, imageFormData) {
    return $.ajax({
        url: rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId + '/images',
        method: 'POST',
        enctype: 'multipart/form-data',
        contentType: false,
        dataType: 'text',
        processData: false,
        data: imageFormData
    });
}

function deleteImageAsync(rootUrlPath, imageId) {
    return deleteAsync(rootUrlPath + API_BASE_PATH + '/images/' + imageId);
}

function getRecipeNotesAsync(rootUrlPath, recipeId) {
    return getAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId + '/notes');
}

function postNoteAsync(rootUrlPath, note) {
    return postAsync(rootUrlPath + API_BASE_PATH + '/notes', JSON.stringify(note));
}

function putNoteAsync(rootUrlPath, note) {
    return putAsync(rootUrlPath + API_BASE_PATH + '/notes/' + note.id, JSON.stringify(note));
}

function deleteNoteAsync(rootUrlPath, noteId) {
    return deleteAsync(rootUrlPath + API_BASE_PATH + '/notes/' + noteId);
}

function putRecipeRatingAsync(rootUrlPath, recipeId, rating) {
    return putAsync(rootUrlPath + API_BASE_PATH + '/recipes/' + recipeId + '/rating', rating);
}

function getTagsAsync(rootUrlPath, tagsFilter) {
    return getAsync(rootUrlPath + API_BASE_PATH + '/tags', tagsFilter);
}
