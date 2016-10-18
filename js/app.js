(function () {
  'use strict';

  var clickedPoint = null;
  var lastText = '';
  var board = JXG.JSXGraph.initBoard('box', {
    boundingbox: [-3, 7, 10, -2],
    axis: true,
    zoom: {
      factorX: 1.25,
      factorY: 1.25,
      wheel: true,
      needshift: false,
      min: 0.1,
      max: 10.0
    },
    pan: {
      enabled: true,
      needTwoFingers: true,
      needshift: false
    }
  });

  var a = board.create('point', [0, 0], { name: 'A', size: 2, fixed: true });
  var b = board.create('point', [1, 5], { name: 'B', size: 2 });
  var c = board.create('point', [4, 4], { name: 'C', size: 2 });
  var d = board.create('point', [6, 0], { name: 'D', size: 2 });

  var pointsObj = {
    A: a,
    B: b,
    C: c,
    D: d
  };

  var m = board.create('point', [-1, 4], { name: 'M', size: 6 });

  var y = board.create('point', [5, 3], { name: 'Y', size: 2, visible: true });

  var deltaAngle = Math.PI / 3;

  var yCopy = board.create('point', [5, 3], { name: 'YCopy', size: 2, visible: false });
  var t = board.create('transform', [Math.PI / 3, m], { type: 'rotate' });

  // create line
  var mLine = board.create('line', [m, y], { straightFirst: false, straightLast: true, strokeWidth: 2, dash: 2, fixed: true });

  var mCopyLine = board.create('line', [yCopy, m], { straightFirst: true, straightLast: true, strokeWidth: 2, dash: 3, fixed: true, visible: false });


  // create polygon
  var poly = board.create('polygon', ["A", "B", "C", "D"]);

  poly.borders.forEach(function (border) {
    border.setAttribute({ fixed: true });
  });


  // find intersections between mLine and poly
  var mIntersections = poly.borders.map(function (border) {
    return board.create('intersection', [mLine, border], { visible: true, alwaysIntersect: false, size: 2, name: border.point1.name + '-' + border.point2.name });
  });

  var mCopyIntersections = poly.borders.map(function (border) {
    return board.create('intersection', [mCopyLine, border], { visible: false, alwaysIntersect: false, name: border.point1.name + '+' + border.point2.name });
  });


  var mRight = board.create('line', [m, function () {
    return [m.X() + 4, m.Y() - 0.5]
  }], { straightFirst: false, straightLast: true, strokeWidth: 2, dash: 2, fixed: true, visible: false });

  var mRightIntersections = poly.borders.map(function (border) {
    return board.create('intersection', [mRight, border], { visible: false, alwaysIntersect: false });
  });

  var abWithCd = board.create('intersection', [poly.borders[0], poly.borders[2]], { visible: true, alwaysIntersect: false });
  var bcWithAd = board.create('intersection', [poly.borders[1], poly.borders[3]], { visible: true, alwaysIntersect: false });

  board.create('text', [1, -1.5, function () {
    return lastText;
  }]);

  // Create a button element at position [1,2].
  var button = board.create('button', [1, -1, 'Начать расчет', improveGuess], {});

  function improveGuess() {
    var existing = mIntersections.filter(exists);
    if (existing.length == 2 || existing.length == 4) {
      var leftRight = separatePoints(mLine, [a, b, c, d]);
      var totalArea = areaOfPolygon([a, b, c, d]);
      console.log('left right is ', leftRight);
      var areas = calculateArea(existing, leftRight[0], leftRight[1]);
      var error = Math.abs(areas[0] - areas[1]);

      var newError = Infinity;
      var newX = null;
      var newY = null;
      var areaLeft, areaRight;


      while (newError > error) {
        var changed = false;

        yCopy.setPosition(JXG.COORDS_BY_USER, [y.X(), y.Y()]);
        var rotationLeft = window.here = board.create('transform', [deltaAngle, m], { type: 'rotate' });
        rotationLeft.applyOnce(yCopy);
        board.update();
        var leftRightFirst = separatePoints(mCopyLine, [a, b, c, d]);
        var intersectionsFirst = mCopyIntersections.filter(exists);
        if (intersectionsFirst.length > 0) {
          var areasFirst = calculateArea(intersectionsFirst, leftRightFirst[0], leftRightFirst[1]);
          if (Math.abs(areasFirst[0] - areasFirst[1]) < newError) {
            changed = true;
            newError = Math.abs(areasFirst[0] - areasFirst[1]);
            newX = yCopy.X();
            newY = yCopy.Y();
            areaLeft = areasFirst[0];
            areaRight = areasFirst[1];
          }
        }
        yCopy.setPosition(JXG.COORDS_BY_USER, [y.X(), y.Y()]);
        var rotationRight = board.create('transform', [-deltaAngle, m], { type: 'rotate' });
        rotationRight.applyOnce(yCopy);
        board.update();
        var leftRightSecond = separatePoints(mCopyLine, [a, b, c, d]);
        var intersectionsSecond = mCopyIntersections.filter(exists);
        if (intersectionsSecond.length > 0) {
          var areasSecond = calculateArea(intersectionsSecond, leftRightSecond[0], leftRightSecond[1]);
          if (Math.abs(areasSecond[0] - areasSecond[1]) < newError) {
            changed = true;
            newError = Math.abs(areasSecond[0] - areasSecond[1]);
            newX = yCopy.X();
            newY = yCopy.Y();
            areaLeft = areasSecond[0];
            areaRight = areasSecond[1];
          }
        }
        if (!changed) {
          deltaAngle /= 2;
        }
        console.log('new angle is ' + deltaAngle);
      }

      lastText = 'слева=' + areaLeft + ' справа=' + areaRight + ' всего=' + totalArea;
      y.moveTo([newX, newY], 1000, {});
    } else if (existing.length === 0) {
      lastText = 'Расчет начат заново';
      y.moveTo([(a.X() + d.X()) / 2, (a.Y() + d.Y()) / 2], 1000, {});
    } else {
      lastText = 'Неожиданное количество пересечений';
      console.warn('Неожиданное количество пересечений ' + existing.length);
    }
  }

  function areaOfPolygon(points) {
    var area = 0;
    var prev = points.length - 1;
    for (var i = 0; i < points.length; i++) {
      area += (points[prev].X() + points[i].X()) * (points[prev].Y() - points[i].Y());
      prev = i;
    }
    return Math.abs(area / 2);
  }

  function areaOfTriangle(p1, p2, p3) {
    return areaOfPolygon([p1, p2, p3])
  }

  function exists(point) {
    return !isNaN(point.X());
  }

  function equal(p1, p2) {
    return p1.X() == p2.X() && p1.Y() == p2.Y();
  }

  function getMouseCoords(e, i) {
    var cPos = board.getCoordsTopLeftCorner(e, i),
      absPos = JXG.getPosition(e, i),
      dx = absPos[0] - cPos[0],
      dy = absPos[1] - cPos[1];
    return new JXG.Coords(JXG.COORDS_BY_SCREEN, [dx, dy], board);
  }

  function getIntersectionCount(intersections) {
    var existing = intersections.filter(exists);
    // remove duplicates
    var result = existing.filter(function (elem, index) {
      var x = elem.X();
      var y = elem.Y();
      return index == existing.findIndex(function (otherPoint) {
        return otherPoint.X() == x && otherPoint.Y() == y;
      });
    });
    // console.log('there are intersections ', result);
    return result.length;
  }

  function squareDistance(point1, point2) {
    var x1 = point1.X(), x2 = point2.X(), y1 = point1.Y(), y2 = point2.Y();
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
  }

  function calculateArea(intersections, left, right) {
    console.log('intersecions is ', intersections);
    console.log('left is ', left);
    console.log('right is ', right);
    var leftArea = 0, rightArea = 0;
    var inter0Point, inter1Point, otherPoint;
    if (left.length + right.length != 4) {
      throw new Error('Unexpected number of left right');
    }
    if (intersections.length == 2) {
      console.log('there were 2 intersections');
      if (left.length == 2) {
        console.log('2 items on the left');
        leftArea = areaOfTriangle(intersections[0], intersections[1], left[0]);
        if (intersections[0].name.indexOf(left[1].name) > -1) {
          leftArea += areaOfTriangle(intersections[0], left[0], left[1]);
        } else {
          leftArea += areaOfTriangle(intersections[1], left[0], left[1]);
        }
        console.log('leftArea is ' + leftArea);

        rightArea = areaOfTriangle(intersections[0], intersections[1], right[0]);
        if (intersections[0].name.indexOf(right[1].name) > -1) {
          rightArea += areaOfTriangle(intersections[0], right[0], right[1]);
        } else {
          rightArea += areaOfTriangle(intersections[1], right[0], right[1]);
        }
      } else if (left.length == 1) {
        leftArea = areaOfTriangle(intersections[0], intersections[1], left[0]);
        inter0Point = intersections[0].name[0] == left[0].name ? intersections[0].name[2] : intersections[0].name[0];
        inter1Point = intersections[1].name[0] == left[0].name ? intersections[1].name[2] : intersections[1].name[0];
        otherPoint = 'ABCD'.replace(left[0].name, '').replace(inter0Point, '').replace(inter1Point, '');
        rightArea = areaOfPolygon([intersections[0], pointsObj[inter0Point], pointsObj[otherPoint], pointsObj[inter1Point], intersections[1]]);
      } else if (right.length == 1) {
        rightArea = areaOfTriangle(intersections[0], intersections[1], right[0]);
        inter0Point = intersections[0].name[0] == right[0].name ? intersections[0].name[2] : intersections[0].name[0];
        inter1Point = intersections[1].name[0] == right[0].name ? intersections[1].name[2] : intersections[1].name[0];
        otherPoint = 'ABCD'.replace(right[0].name, '').replace(inter0Point, '').replace(inter1Point, '');
        leftArea = areaOfPolygon([intersections[0], pointsObj[inter0Point], pointsObj[otherPoint], pointsObj[inter1Point], intersections[1]]);
      } else {
        throw new Error('Unexpected number of left right');
      }
    } else if (intersections.length == 4) {
      var first, second, third, fourth;
      var furthestDistance = 0;
      for (var i = 0; i < 3; i++) {
        for (var j = i + 1; j < 4; j++) {
          var currentDistance = squareDistance(intersections[i], intersections[j]);
          if (currentDistance > furthestDistance) {
            furthestDistance = currentDistance;
            first = intersections[i];
            fourth = intersections[j];
          }
        }
      }

      var middlePoints = [];
      for (var i = 0; i < 4; i++) {
        var current = intersections[i];
        if (current != first && current != fourth) {
          middlePoints.push(current);
        }
      }
      if (squareDistance(middlePoints[0], first) > squareDistance(middlePoints[1], first)) {
        second = middlePoints[1];
        third = middlePoints[0];
      } else {
        second = middlePoints[0];
        third = middlePoints[1];
      }

      console.log("first fourth is ");
      console.log(first);
      console.log(second);
      console.log(third);
      console.log(fourth);
      var common = findCommonPoint(first, fourth);
      console.log("common is " + common);
      var withCommon;
      if (left.findIndex(function (elem) { return elem.name == common; }) > -1) {
        withCommon = (left[0].name == common) ? left[1] : left[0];

        leftArea = areaOfPolygon([pointsObj[common], first, second, withCommon, third, fourth]);

        rightArea = areaOfTriangle(first, second, pointsObj[findCommonPoint(first, second)]);
        rightArea += areaOfTriangle(third, fourth, pointsObj[findCommonPoint(third, fourth)]);
      } else {
        withCommon = (right[0].name == common) ? right[1] : right[0];
        rightArea = areaOfPolygon([pointsObj[common], first, second, withCommon, third, fourth]);
        leftArea = areaOfTriangle(first, second, pointsObj[findCommonPoint(first, second)]);
        leftArea += areaOfTriangle(third, fourth, pointsObj[findCommonPoint(third, fourth)]);
      }
      console.log("withCommon is ", withCommon);
    } else {
      throw Error("Unexpected intersection count " + intersections.length);
    }
    return [leftArea, rightArea];
  }

  function findCommonPoint(first, second) {
    var pointNames = [first.name[0], first.name[2], second.name[0], second.name[2]];
    console.log('points names is ', pointNames);
    return pointNames.find(function (elem, index) {
      return pointNames.lastIndexOf(elem) != index;
    });
  }

  function separatePoints(line, points) {
    var slope = line.getSlope(), rise = line.getRise(), x = line.point1.X();
    var left = [], right = [];
    console.log('y = ' + slope + 'x + ' + rise);
    points.forEach(function (point) {
      if (slope == Infinity) {
        if (point.X() > x) {
          right.push(point);
        } else {
          left.push(point);
        }
      } else {
        if (point.X() * slope + rise < point.Y()) {
          right.push(point);
        } else {
          left.push(point);
        }
      }
    });
    return [left, right];
  }

  board.on('move', function (event) {
    board.suspendUpdate();
    if (clickedPoint) {
      if (exists(abWithCd)) {
        clickedPoint.moveTo([abWithCd.X(), abWithCd.Y()]);
      }
      if (exists(bcWithAd)) {
        clickedPoint.moveTo([bcWithAd.X(), bcWithAd.Y()]);
      }

    }
    [a, b, c, d].forEach(function (point) {
      if (equal(point, m)) {
        m.moveTo([m.X() + 0.0001, m.Y() + 0.0001]);
      }
    });

    d.moveTo([Math.max(d.X(), 0), 0]);
    if (getIntersectionCount(mRightIntersections) % 2 == 1) {
      mLine.setAttribute({ straightFirst: true });
    } else {
      mLine.setAttribute({ straightFirst: false });
    }
    board.unsuspendUpdate();
  });

  board.on('down', function (e) {
    var i, coords, el;
    if (e[JXG.touchProperty]) {
      i = 0;
    }
    coords = getMouseCoords(e, i);
    for (el in board.objects) {
      if (JXG.isPoint(board.objects[el]) && board.objects[el].hasPoint(coords.scrCoords[1], coords.scrCoords[2])) {
        clickedPoint = board.objects[el];
        break;
      }
    }
    if (clickedPoint) {
      deltaAngle = Math.PI / 3;
    }
  });

  board.on('up', function () {
    clickedPoint = null;
  });

})();
