import { Vec3, Vec2 } from '../types';

export function vec3_create(x: number = 0, y: number = 0, z: number = 0): Vec3 {
  return new Float32Array([x, y, z]);
}

export function vec3_copy(out: Vec3, a: Vec3): Vec3 {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  return out;
}

export function vec3_add(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}

export function vec3_subtract(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}

export function vec3_scale(out: Vec3, a: Vec3, scalar: number): Vec3 {
  out[0] = a[0] * scalar;
  out[1] = a[1] * scalar;
  out[2] = a[2] * scalar;
  return out;
}

export function vec3_scaleAndAdd(out: Vec3, a: Vec3, b: Vec3, scale: number): Vec3 {
  out[0] = a[0] + (b[0] * scale);
  out[1] = a[1] + (b[1] * scale);
  out[2] = a[2] + (b[2] * scale);
  return out;
}

export function vec3_distance(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function vec3_length(a: Vec3): number {
  return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function vec3_normalize(out: Vec3, a: Vec3): Vec3 {
  const len = vec3_length(a);
  if (len > 0) {
    out[0] = a[0] / len;
    out[1] = a[1] / len;
    out[2] = a[2] / len;
  }
  return out;
}

export function vec3_dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vec3_cross(out: Vec3, a: Vec3, b: Vec3): Vec3 {
  const ax = a[0], ay = a[1], az = a[2];
  const bx = b[0], by = b[1], bz = b[2];

  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;

  return out;
}

export function vec3_lerp(out: Vec3, a: Vec3, b: Vec3, t: number): Vec3 {
  out[0] = a[0] + t * (b[0] - a[0]);
  out[1] = a[1] + t * (b[1] - a[1]);
  out[2] = a[2] + t * (b[2] - a[2]);
  return out;
}