let LOOP_NO = 1;

function getLoopNo() {
  return LOOP_NO < Number.MAX_SAFE_INTEGER ? LOOP_NO++ : LOOP_NO = 1;
}

module.exports = {
  getLoopNo
};
