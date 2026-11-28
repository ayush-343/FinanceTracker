// Globals the AI SDK expects that Hermes may not provide. Installed only when missing.
import structuredClone from '@ungap/structured-clone';
import { ReadableStream, TransformStream, WritableStream } from 'web-streams-polyfill';

const g = globalThis as any;
if (typeof g.structuredClone !== 'function') g.structuredClone = (value: unknown) => structuredClone(value as any);
if (typeof g.ReadableStream === 'undefined') g.ReadableStream = ReadableStream;
if (typeof g.TransformStream === 'undefined') g.TransformStream = TransformStream;
if (typeof g.WritableStream === 'undefined') g.WritableStream = WritableStream;
