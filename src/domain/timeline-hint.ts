export const PEEK_MAX_SCROLL_Y = 8;
/** 页面就绪后先静一静，别一进来就动 */
export const PEEK_START_DELAY_MS = 1_500;
/** 一次提示动画的总时长，CSS 与用例共用同一个值 */
export const PEEK_DURATION_MS = 3_000;

export type TimelinePeekState = {
  reducedMotion: boolean;
  scrollY: number;
  timelineActive: boolean;
  panelOpen: boolean;
};

/**
 * 页面加载完成后要不要把专辑时间线弹一下露出手柄。
 * 只在用户还没动过页面、时间线也没被激活、并且没有卡片/面板展开时提示。
 */
export function shouldPeekTimeline(state: TimelinePeekState) {
  if (state.reducedMotion) return false;
  if (state.panelOpen) return false;
  if (state.timelineActive) return false;
  return state.scrollY <= PEEK_MAX_SCROLL_Y;
}
