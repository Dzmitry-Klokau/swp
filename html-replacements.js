export function addDelayFunction(body) {
  return body.replace(
    "<head>",
    `<head>
      <script>
      function delay(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
      }
      </script>
      `
  );
}

export function addHumanClickFunction(body) {
  return body.replace(
    "<head>",
    `<head>
      <script>
      function delay(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
      }
      
      function createMouseEvent(type, x, y) {
          return new MouseEvent(type, {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              button: 0
          });
      }
      
      async function humanLikeClick(element) {
          const rect = element.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
      
          const randomOffset = () => (Math.random() - 0.5) * 10; // ±5 пикселей
      
          const path = [
              [centerX - 100, centerY - 50],
              [centerX - 50, centerY - 20],
              [centerX + randomOffset(), centerY + randomOffset()],
              [centerX, centerY],
          ];
      
          for (let [x, y] of path) {
              element.dispatchEvent(createMouseEvent('mousemove', x, y));
              await delay(100 + Math.random() * 100);
          }
      
          element.dispatchEvent(createMouseEvent('mouseover', centerX, centerY));
          await delay(100 + Math.random() * 100);
      
          element.dispatchEvent(createMouseEvent('mousemove', centerX, centerY));
          await delay(100 + Math.random() * 100);
      
          element.dispatchEvent(createMouseEvent('mousedown', centerX, centerY));
          await delay(120 + Math.random() * 100);
      
          element.dispatchEvent(createMouseEvent('mouseup', centerX, centerY));
          await delay(80 + Math.random() * 80);
      
          element.dispatchEvent(createMouseEvent('click', centerX, centerY));
      }
      </script>
      `
  );
}
