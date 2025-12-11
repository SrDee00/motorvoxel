import { Component } from '../types';
import { component } from '../decorators';

@component('Velocity')
export class VelocityComponent extends Component {
  linear: [number, number, number] = [0, 0, 0];
  angular: [number, number, number] = [0, 0, 0];
}