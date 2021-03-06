/**
 * @constructor
 */
var Contour = function () {
    var _a,
        _b,
        _alpha,
        _delta,
        _radius,
        _n,
        _points = [],
        _discretePoints = [],
        _eps = 0,
        _correctBorderIntersect,
        _whistleIndexes = [];

    /**
     * Initialize Contour with given lengths
     * @param a float - width
     * @param alpha float - angle of circle sector,
     * @param delta float - 'y' offset of circle,
     * @param radius float - radius
     * @param n int - number of points
     * @param p {float, float} - center of top left contour point
     */
    this.initialize = function(a, alpha, delta, radius, n, p) {
        _a = a;
        _alpha = alpha;
        _delta = delta;
        _n = n;
        _radius = radius || Contour.RADIUS;
        p = p || {x: 0, y: (2 * _radius)};

        _pointsCalculate(p);
    };

    /**
     * Return an array of contour points
     * @returns {{float, float}[]}
     */
    this.getPoints = function () {
        return _points;
    };

    /**
     * Return an array of discrete points
     * @returns int[]
     */
    this.getDiscretePoints = function () {
        return _discretePoints;
    };

    /**
     * @return int[]
     */
    this.getWindDiscretePoints = function () {
        var discTemp = JSON.parse(JSON.stringify(_discretePoints)),
            ret = [];

        for (var i = 0; i < discTemp.length; ++i) {
            if (i === 1 || i === 2) {
                continue;
            }
            ret.push(discTemp[i]);
        }

        return ret;
    };

    /**
     * Return epsilon
     * @return {number}
     */
    this.getEpsilon = function () {
        return _eps;
    };

    /**
     * Return whistle indexes
     * @return integer[]
     */
    this.getWhistleIndexes = function () {
        return _whistleIndexes;
    };

    /**
     * @param pointOld Object
     * @param pointNew Object
     * @return {Function}
     */
    this.correctBorderIntersectCallback = function (pointOld, pointNew) {
        return _correctBorderIntersect(pointOld, pointNew);
    };

    /**
     * Fill _points and _discretePoints arrays
     * @param p - {float, float} - center
     * @private
     */
    var _pointsCalculate = function (p) {
        var hordSquare = 2 * Math.pow(_radius, 2) * (1 - Math.cos(_alpha));
        _b = Math.sqrt(hordSquare) * Math.cos((Math.PI - _alpha) / 2) + _delta;

        var segmentLength = _radius * (2 * Math.PI - _alpha),
            length = 2 * _a + _b + segmentLength,
            hordX = Math.sqrt(hordSquare - Math.pow((_b - _delta), 2)),
            step = length / (_n - 1);

        var i;

        for (i = _a; i >= 0; i -= step) {
            _points.push({
                x: p.x + i,
                y: p.y
            });
        }
        _points[_points.length - 1].x = p.x;

        _discretePoints.push(0, _points.length - 1);

        _whistleIndexes.push(_points.length - 1);
        for (i = p.y + - step; i >= p.y - _b; i -= step) {
            _points.push({
                x: p.x,
                y: i
            });
            _whistleIndexes.push(_points.length - 1);
        }
        _points[_points.length - 1].y = p.y - _b;
        _whistleIndexes.splice(_whistleIndexes.length - 1, 1);

        _discretePoints.push(_points.length - 1);

        for (i = _a - step; i >= 0; i -= step) {
            _points.push({
                x: p.x + _a - i,
                y: p.y - _b
            });
        }
        _points[_points.length - 1].x = p.x + _a;

        _discretePoints.push(_points.length - 1);

        var epsilonIndexStart = _points.length - 2;

        var nLeft = _n - _points.length + 1,
            angleStep = (2 * Math.PI - _alpha) / nLeft,
            x0 = _a + hordX + p.x,
            y0 = p.y - _delta - _radius;

        for (i = Math.PI / 2 + _alpha + angleStep; i <= 2.5 * Math.PI; i += angleStep) {
            _points.push({
                x: x0 + _radius * Math.cos(i),
                y: y0 + _radius * Math.sin(i)
            });
        }
        _points[_points.length - 1] = {
            x: p.x + _a + hordX,
            y: p.y - _delta
        };

        _discretePoints.push(_points.length - 1);

        _eps = step / 2;

        _correctBorderIntersect = function (pointOld, pointNew) {
            var middlePointX = (pointOld.x + pointNew.x) / 2,
                delta = _eps * 2 + 0.001;

            // for contour '_' and '-'
            var segment2 = {
                    start: _points[_discretePoints[1]],
                    end: _points[_discretePoints[0]]
                },
                segment3 = {
                    start: _points[_discretePoints[2]],
                    end: _points[_discretePoints[3]]
                };
            if ((middlePointX > segment2.start.x) && (middlePointX < segment2.end.x)) {
                if (((pointNew.y > segment2.start.y) && (pointOld.y < segment2.start.y))
                    || ((pointNew.y < segment2.start.y) && (pointOld.y > segment2.start.y))) {

                    pointNew.y = segment2.start.y - (pointNew.y - pointOld.y);
                }
            }
            if ((middlePointX > segment3.start.x) && (middlePointX < segment3.end.x)) {
                if (((pointNew.y > segment3.start.y) && (pointOld.y < segment3.start.y))
                    || ((pointNew.y < segment3.start.y) && (pointOld.y > segment3.start.y))) {

                    pointNew.y = segment3.start.y - (pointNew.y - pointOld.y);
                }
            }

            var inStripCheck = function (pointIn, pointOther, coordIntersect, coordBeg, coordEnd) {
                    return (pointIn > (coordIntersect - delta)) &&
                        (pointIn < (coordIntersect + delta)) &&
                        (pointOther > coordBeg) &&
                        (pointOther < coordEnd);
                },
                correctStripIntersect = function (pointOldCoord, coordInterset, invert) {
                    if (pointOldCoord < coordInterset) {
                        return coordInterset - delta;
                    } else if (pointOldCoord > coordInterset) {
                        return coordInterset + delta;
                    } else if (pointOldCoord === coordInterset) {
                        return invert ? coordInterset - delta : coordInterset + delta;
                    }
                };

            if (inStripCheck(pointNew.y, pointNew.x, segment2.start.y, segment2.start.x, segment2.end.x)) {
                pointNew.y = correctStripIntersect(pointOld.y, segment2.start.y, false);
            } else if (inStripCheck(pointNew.y, pointNew.x, segment3.start.y, segment2.start.x, segment2.end.x)) {
                pointNew.y = correctStripIntersect(pointOld.y, segment3.start.y, true);
            }

            // for contour 'C'
            var inAngleCorrect = function (inContour) {
                var angleCalc = function (point) {
                    var result = 0,
                        pointDeltaTemp = {
                            x: point.x - x0,
                            y: point.y - y0
                        };

                    if (point.x > x0) {
                        if (point.y >= y0) {
                            result = Math.atan(pointDeltaTemp.y / pointDeltaTemp.x);
                        } else {
                            result = Math.atan(pointDeltaTemp.y / pointDeltaTemp.x) + 2 * Math.PI;
                        }
                    } else if (point.x < x0) {
                        result = Math.atan(pointDeltaTemp.y / pointDeltaTemp.x) + Math.PI;
                    } else {
                        if (point.y > y0) {
                            result = Math.PI / 2;
                        } else if (point.y < y0) {
                            result = 3 * Math.PI / 2;
                        } else {
                            throw new Error('Point in circle center!');
                        }
                    }

                    if (result > 2 * Math.PI || angle < 0) {
                        throw new Error('Circle angle computing error');
                    }

                    return result;
                };
                var angle = angleCalc(pointNew),
                    angleOld = angleCalc(pointOld);

                if ((angle < Math.PI / 2) || (angle > Math.PI / 2 + _alpha)) {
                    var newRadius;
                    if (inContour) {
                        newRadius = _radius - delta;
                    } else {
                        newRadius = _radius + delta;
                    }

                    pointNew.x = x0 + newRadius * Math.cos(angleOld + 2 * (angle - angleOld));
                    pointNew.y = y0 + newRadius * Math.sin(angleOld + 2 * (angle - angleOld));
                }
            };

            // In strip check
            if ((Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) > Math.pow(_radius - delta, 2))
                && (Math.pow(x0 - pointOld.x, 2) + Math.pow(y0 - pointOld.y, 2) < Math.pow(_radius - delta, 2))) {
                inAngleCorrect(true);
            } else if ((Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) < Math.pow(_radius + delta, 2))
                && (Math.pow(x0 - pointOld.x, 2) + Math.pow(y0 - pointOld.y, 2) > Math.pow(_radius + delta, 2))) {
                inAngleCorrect(false);
            } else if ((Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) > Math.pow(_radius, 2))
                && (Math.pow(x0 - pointOld.x, 2) + Math.pow(y0 - pointOld.y, 2) < Math.pow(_radius, 2))) {
                inAngleCorrect(true);
            } else if ((Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) < Math.pow(_radius, 2))
                && (Math.pow(x0 - pointOld.x, 2) + Math.pow(y0 - pointOld.y, 2) > Math.pow(_radius, 2))) {
                inAngleCorrect(false);
            } else if ((Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) > Math.pow(_radius - delta, 2))
                && (Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) < Math.pow(_radius, 2))) {
                inAngleCorrect(true);
            } else if ((Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) < Math.pow(_radius + delta, 2))
                && (Math.pow(x0 - pointNew.x, 2) + Math.pow(y0 - pointNew.y, 2) > Math.pow(_radius, 2))) {
                inAngleCorrect(false);
            }

            return pointNew;
        }
    };

    /**
     * @param index int - first index of three points between which max eps contains
     * @private
     * @return {number}
     */
    var _processEpsilon = function (index) {
        var point1 = _points[index],
            point2 = _points[index + 1],
            point3 = _points[index + 2];

        /**
         * @param p1 Object
         * @param p2 Object
         * @return {number}
         */
        var distance = function (p1, p2) {
            return Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2));
        };

        return Math.min(distance(point1, point2), distance(point2, point3), distance(point3, point1));
    };
};

Contour.RADIUS = 1;
