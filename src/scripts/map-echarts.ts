import { init, registerMap, use } from 'echarts/core';
import { EffectScatterChart, LinesChart, MapChart } from 'echarts/charts';
import { GeoComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([MapChart, LinesChart, EffectScatterChart, GeoComponent, CanvasRenderer]);

export { init, registerMap };
