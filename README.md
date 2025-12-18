# Engel — Demo Programming Language (Browser-based Interpreter)

Engel is a custom programming language implemented as a browser-based interpreter, designed to explore coroutine-style execution, strong dynamic typing, and expressive syntax in a DOM-driven environment.

This implementation was created as a project for an exposition at the **VIEX Conference (2020)**, with assistance from translator **Karla González**.  
The exposition is viewable here:  
https://youtu.be/5e4_yozqeFg?t=21430

---

## Running the Demo

Serve the files locally:

```bash
python3 -m http.server 8000
```
then go to `http://localhost:8000` in your browser of choice.

---
## Language Features   
Engel supports a compact but expressive feature set, including:  

**Imports**  
```
import io
```  
**Variables and constants**
```
let x = 100
dec PI = 3.14
```
**First class functions (and closures)**  
```
io.print((() -> PI * x)()
```  
**Classless objects**
```
#{
  x = 10
  y = 30
  mag() -> (this.x ^ 2 + this.y ^ 2) ^ 0.5
}
```
**Operator overloading**
```
dec Vector2d = (x, y) -> #{
	x = x
	y = y
	+ other -> Vector2d(this.x + other.x, this.y + other.y)
}
dec a = Vector2d(20, 50)
dec b = Vector2d(40, 20)
dec c = a + b
io.print(c.x, c.y)
```
**String interpolation**  
```
'9 + 10 = #{9 + 10}'
```  
**Built-in Data types**
- arrays `[ 'Monday', 'Tuesday', 'Wednesday' ]`
- hashmaps `#[ 'hello': 'world', 7: 'Sunday' ]`  

**Singleline comments**
```
io.print('hi') ; a print call
```
**Multiline comments**
```
` use backtics
` they can nest! .`

.`
```



## Runtime Notes

The interpreter runs as a non-blocking main loop that cooperatively yields while interacting with the DOM.  
Standard `setTimeout` scheduling proved too coarse (approximately 17ms resolution), so a finer-grained scheduling approach was used to maintain responsiveness during execution.  

## Credits  
**Caret.js** — browser-based code editor  
*MIT License*  
https://github.com/ichord/Caret.js/  

**Soon** — lightweight scheduling utility used to support fine-grained cooperative execution
*MIT License*
https://github.com/bluejava/zousan
