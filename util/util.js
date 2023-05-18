

exports.getCapitalLetters = (str) => {
  let words = str.split(" ");
  let result = "";
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    if (word.length > 0) {
      result += word[0].toUpperCase();
    }
  }

  return result;
};