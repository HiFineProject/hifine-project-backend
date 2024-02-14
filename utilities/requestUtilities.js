export const checkMissingField = (keys, data) => {
    let result = true;
    let missingFields = [];
    for (let index = 0; index < keys.lenght; index++) {
        const key = keys[index];
        if (!Object.keys(data).includes(key)){
            result = false;
            missingFields.push(key);
        }
    }
    return [result, missingFields];
}