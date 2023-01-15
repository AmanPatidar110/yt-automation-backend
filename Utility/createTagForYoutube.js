exports.createTagForYoutube = (commaSeparatedTag) => {
    return commaSeparatedTag.split(',').map((tag) => tag.trim());
};
