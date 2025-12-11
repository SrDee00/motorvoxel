import { Component } from '../types';
import { component } from '../decorators';

@component('Transform')
export class TransformComponent extends Component {
  position: [number, number, number] = [0, 0, 0];
  rotation: [number, number, number, number] = [0, 0, 0, 1];
  scale: [number, number, number] = [1, 1, 1];
}