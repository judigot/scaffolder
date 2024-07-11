import identifyRelationships from '@/utils/identifyRelationships';

function generateSQLJoins(
  tableInfo: Record<string, Record<string, unknown>[]>,
) {
  const allowSymmetricalJoins = true;

  const relationships = identifyRelationships(tableInfo);

  /* prettier-ignore */ (() => { const QuickLog = JSON.stringify(relationships, null, 4); const parentDiv = document.getElementById('quicklogContainer') ?? (() => {const div = document.createElement('div');div.id = 'quicklogContainer';div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end;';document.body.appendChild(div);return div; })(); const createChildDiv = (text: typeof QuickLog) => {const newDiv = Object.assign(document.createElement('div'), { textContent: text, style: 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer;',});const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div');if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { const textArea = document.createElement('textarea'); textArea.value = clickedDiv.textContent ?? ''; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }};const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); }};newDiv.addEventListener('mousedown', handleMouseDown);newDiv.addEventListener('contextmenu', handleRightClick);return newDiv; };parentDiv.prepend(createChildDiv(QuickLog)); })()

  const joinQueries = relationships
    .filter(({ foreignTables }) => foreignTables.length > 0)
    .flatMap(({ table, foreignTables, foreignKeys }) => {
      const joinClauses = foreignTables.map((foreignTable, index) => {
        const joinClause = `JOIN "${foreignTable}" ON "${table}".${foreignKeys[index]} = "${foreignTable}".${foreignKeys[index]}`;
        const symmetricalJoinClause = `JOIN "${table}" ON "${foreignTable}".${foreignKeys[index]} = "${table}".${foreignKeys[index]}`;

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return allowSymmetricalJoins
          ? [
              `SELECT * FROM "${table}" ${joinClause};`,
              `SELECT * FROM "${foreignTable}" ${symmetricalJoinClause};`,
            ]
          : [`SELECT * FROM "${table}" ${joinClause};`];
      });

      return joinClauses.flat();
    });

  // const joinQueriesWithoutDuplicates = relationships.map(
  //   ({ table, foreignKeys, foreignTables }) => {
  //     const joinClauses = foreignTables
  //       .map((foreignTable, index) => {
  //         const tablesInAlphabetical = [table, foreignTable].sort((a, b) =>
  //           a.localeCompare(b),
  //         );
  //         if (table !== tablesInAlphabetical[0]) {
  //           return `SELECT * FROM "${table}" JOIN "${tablesInAlphabetical[0]}" ON "${tablesInAlphabetical[0]}".${foreignKeys[index]} = "${tablesInAlphabetical[1]}".${foreignKeys[index]};`;
  //         }
  //       })
  //       .join(' ');
  //     return joinClauses;
  //   },
  // );

  return joinQueries;
}

export default generateSQLJoins;
