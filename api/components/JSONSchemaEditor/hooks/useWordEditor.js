import { useState } from 'react';
export const useWordEditor = (text) => {
  const [previousWord, setPreviousWord] = useState('');
  const [newCharacter, setChangedCharacter] = useState('');
  const [newWord, setNewWord] = useState('');
  const handleWordEdit = (e) => {
    const { value } = e.target;
    const selectionStart = e.target.selectionStart;
    const rawPreviousWord = getCurrentWord(text, selectionStart - 1);
    const rawNewWord = getCurrentWord(value, selectionStart);
    let rawNewChar = '';
    let changeIndex = -1;
    for (let i = 0; i < rawNewWord.length; i++) {
      if (rawPreviousWord[i] !== rawNewWord[i]) {
        rawNewChar = rawNewWord[i];
        changeIndex = i;
        break;
      }
    }
    if (changeIndex === -1) {
      rawNewChar = rawNewWord[rawNewWord.length - 1];
    }
    const previousWord = removeInvalidCharacters(rawPreviousWord);
    const changedChar = removeInvalidCharacters(rawNewChar ? rawNewChar : '');
    const newWord = removeInvalidCharacters(rawNewWord);
    setPreviousWord(previousWord);
    setChangedCharacter(changedChar);
    setNewWord(newWord);
    return {
      previousWord,
      changedChar,
      newWord,
    };
  };
  const removeInvalidCharacters = (str) => {
    return str.replace(/["\\\b\f\n\r\t]/g, '');
  };
  const getCurrentWord = (text, index) => {
    const leftPart =
      text
        .slice(0, index)
        .split(/[\s,{}[\]:]+/)
        .pop() ?? '';
    const rightPart = text.slice(index).split(/[\s,{}[\]:]+/)[0] || '';
    return leftPart + rightPart;
  };
  return {
    handleWordEdit,
    previousWord,
    newCharacter,
    newWord,
  };
};
