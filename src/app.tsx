import React, { useEffect } from 'react'
import { useDidShow, useDidHide } from '@tarojs/taro'
import { useUserStore } from './store/user'
import { startHeartbeat, sendHeartbeat } from './utils/platformStats'
// 全局样式
import './app.scss';

function App(props) {
  // 可以使用所有的 React Hooks
  useEffect(() => {
    useUserStore.getState().hydrate()
    // 平台统计：匿名设备心跳（在线人数/总人数的数据来源，未配置时自动空转）
    startHeartbeat()
  }, []);

  // 对应 onShow
  useDidShow(() => {
    sendHeartbeat();
  });

  // 对应 onHide
  useDidHide(() => {});

  return props.children;
}

export default App;
