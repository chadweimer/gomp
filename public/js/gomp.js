
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

    try {
        sessionStorage.setItem(field, JSON.stringify(val));
    } catch (err) {
        // TODO: What should we do with this?
    }

    return val;
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

function loadRecipeAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId,
        method: 'GET',
        dataType: 'json',
    });
}

function loadMainImageAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/image',
        method: 'GET',
        dataType: 'json',
    });
}

function setMainImageAsync(rootUrlPath, recipeId, imageId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/image',
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify({
            id: imageId,
            recipeId: recipeId,
        }),
    });
}

function loadImagesAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/images',
        method: 'GET',
        dataType: 'json',
    });
}

function addImageAsync(rootUrlPath, recipeId, imageFormData) {
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

function deleteImageAsync(rootUrlPath, recipeId, imageId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/images/' + imageId,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text',
    });
}

function loadNotesAsync(rootUrlPath, recipeId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes',
        method: 'GET',
        dataType: 'json',
    });
}

function addNoteAsync(rootUrlPath, recipeId, text) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify({
            recipeId: recipeId,
            text: text,
        }),
    });
}

function editNoteAsync(rootUrlPath, recipeId, noteId, text) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes/' + noteId,
        method: 'PUT',
        contentType: 'application/json',
        dataType: 'text',
        processData: false,
        data: JSON.stringify({
            id: noteId,
            recipeId: recipeId,
            text: text,
        }),
    });
}

function deleteNoteAsync(rootUrlPath, noteId) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/notes/' + noteId,
        method: 'DELETE',
        contentType: 'application/json',
        dataType: 'text',
    });
}

function editRatingAsync(rootUrlPath, recipeId, rating) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/recipes/' + recipeId + '/rating',
        method: 'PUT',
        dataType: 'json',
        processData: false,
        data: rating,
    });
}

function loadTagsAsync(rootUrlPath) {
    return $.ajax({
        url: rootUrlPath + '/api/v1/tags',
        method: 'GET',
        dataType: 'json',
    });
}
