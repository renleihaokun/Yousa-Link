export const PEEK_MAX_SCROLL_Y = 8;

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
