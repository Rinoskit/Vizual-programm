export function createUser(id, name, email) {
    return {
        id,
        name,
        email,
        isActive: true
    };
}
export function createBook(book) {
    return book;
}
export function calculateArea(shape, parameter) {
    if (shape === 'circle') {
        return Math.PI * parameter * parameter;
    }
    else {
        return parameter * parameter;
    }
}
export function getStatusColor(status) {
    if (status === 'active') {
        return 'green';
    }
    else if (status === 'inactive') {
        return 'red';
    }
    else {
        return 'yellow';
    }
}
export const capitalizeFirst = (str, uppercase = false) => {
    let result = str.charAt(0).toUpperCase() + str.slice(1);
    if (uppercase) {
        result = result.toUpperCase();
    }
    return result;
};
export const trimAndTransform = (str, uppercase = false) => {
    let result = str.trim();
    if (uppercase) {
        result = result.toUpperCase();
    }
    return result;
};
export function getFirstElement(arr) {
    return arr.length > 0 ? arr[0] : undefined;
}
export function findById(items, id) {
    return items.find(item => item.id === id);
}
//# sourceMappingURL=script.js.map