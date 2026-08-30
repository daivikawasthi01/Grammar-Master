import buffer from 'buffer';

if (!(buffer as any).SlowBuffer) {
  (buffer as any).SlowBuffer = buffer.Buffer;
}
