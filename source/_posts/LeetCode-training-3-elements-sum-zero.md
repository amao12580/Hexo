---
title: LeetCode刷题 - 求三个和为零的整数组合
date: 2016年6月22日12:19:02
tags:
    - LeetCode
    - Training
categories:
    - LeetCode
description: 正负数配对，然后看他们的和的取反是不是存在，存在就说明这是一个合法的结果。例如发现1和-3这两个正负数，求和为-2，再取反得到2，只需要在剩余数组中找到2即可，若存在则是一个预备结果（还要考虑去重复）。其实相当暴力，但关键在于正负数配对，导致性能可以很大提升。因为三个数之和要等于零，必然是++-、--+和000（我们把0归到+或-之一）这三种情况中的一种。

---

# 写在前面


完整的代码整理好了，请移步GitHub：
* [https://github.com/amao12580/algorithm/tree/master/src/main/java/leetcode/sumEqualZero](https://github.com/amao12580/algorithm/tree/master/src/main/java/leetcode/sumEqualZero)


知乎《职人介绍所》中，请到了不论是技术水平还是名气（也许包括薪水）都在业界名列前茅的[@winter](https://www.zhihu.com/people/ec03b8e839a6fb763e1b8113455362db)和[@赵劼](https://www.zhihu.com/people/78e3b98074a915b222ae1be4ab038a6e)。链接在这里：[《职人介绍所》第 21 期：中国特别有名的两位程序员 winter 和赵劼来了](http://daily.zhihu.com/story/8467704)

在围观这期剪辑版的视频后，对手写代码的那道题目产生了高昂的兴趣，细想下来这道题还是挺难的，尤其是现场还不准掀桌呢！哈哈！

# 题目内容

有一个随机整数数组，从中挑ABC三个整数，让ABC三个整数加起来等于零，看有多少个不重复的组合？

在LeetCode上也有这道题：[3Sum _ LeetCode OJ](https://leetcode.com/problems/3sum/)

# 思考

很简单，就是把正负数配对，然后看他们的和的取反是不是存在，存在就说明这是一个合法的结果。

例如发现1和-3这两个正负数，求和为-2，再取反得到2，只需要在剩余数组中找到2即可，若存在则是一个预备结果（还要考虑去重复）。

其实相当暴力，但关键在于正负数配对，导致性能可以很大提升。

因为三个数之和要等于零，必然是++-、--+和000（我们把0归到+或-之一）这三种情况中的一种。

## 荷兰国旗问题

刚开始的思路走偏了，想到了荷兰国旗问题。[”荷兰国旗难题“](http://www.cnblogs.com/junyuhuang/p/4390780.html)是计算机科学中的一个程序难题，它是由Edsger Dijkstra提出，荷兰国旗是由红、白、蓝三色组成的。要求将数值种类固定的乱序数组排列为 “AAA,BBB,CCC” 的形式，其实对两端排好，中间的那部分就自然排好了。

原题还是很不一样的，首先在原题中数组是随机整数，而荷兰国旗问题中，数组是种类固定的数据（不一定是Number类型哦）。其次是相关性，荷兰国旗问题只需要按数据进行分类在找到位置即可（计数排序算法）。

# 简单实现

时间复杂度：O(n<sup>3</sup>)

空间复杂度：O(n)

```

public class SolutionForSimple {
    public static void main(String[] args) {
        int[] originArray = {0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5};
        System.out.println("input:" + Arrays.toString(originArray));
        System.out.println("-------      simple        -------");
        println(simple(originArray, 3));
    }

    private static void println(int[][] result) {
        System.out.println();
        System.out.println("-------      begin        -------");
        System.out.println("-------      count:" + result.length + "        -------");
        for (int i = 0; i < result.length; i++) {
            System.out.println((i + 1) + ":" + Arrays.toString(result[i]));
        }
        System.out.println("-------      end        -------");
    }

    /**
     * 简单实现，3重for循环，同时去重
     *
     * @param originArray 原始数组
     * @param number      几个数相加？
     * @return 结果组合
     */
    private static int[][] simple(int[] originArray, int number) {
        int length = originArray.length;
        int[][] result = new int[length][number];
        int index = 0;
        for (int i = 0; i < length; i++) {
            for (int j = i + 1; j < length; j++) {
                for (int k = j + 1; k < length; k++) {
                    if ((originArray[i] + originArray[j] + originArray[k]) == 0) {
                        int[] group = {originArray[i], originArray[j], originArray[k]};
                        if (index >= result.length) {
                            result = resize(result);
                        }
                        result[index] = group;
                        index++;
                    }
                }
            }
        }
        if ((result.length - index) > 0) {
            result = trim(result, index);
        }
        return result;
    }

    private static int[][] trim(int[][] result, int index) {
        int[][] newResult = new int[index][result[0].length];
        System.arraycopy(result, 0, newResult, 0, newResult.length);
        return newResult;
    }

    private static int[][] resize(int[][] result) {
        int[][] newResult = new int[result.length + result[0].length][result[0].length];
        System.arraycopy(result, 0, newResult, 0, result.length);
        return newResult;
    }
}



以下是打印的结果：OK

input:[0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5]
-------      simple        -------

-------      begin        -------
-------      count:13        -------
1:[0, 1, -1]
2:[0, 2, -2]
3:[0, 3, -3]
4:[0, 4, -4]
5:[0, 5, -5]
6:[1, 2, -3]
7:[1, 3, -4]
8:[1, 4, -5]
9:[2, 3, -5]
10:[3, -1, -2]
11:[4, -1, -3]
12:[5, -1, -4]
13:[5, -2, -3]
-------      end        -------

```

# 递归实现
简单实现的代码，虽然清晰易懂，但可复用性很低。例如现在将求三个数的和换为求四个数，基本上代码就得大改了，所以做了可重用的版本（OO思想的潜意识啊！），使用递归实现。

时间复杂度：O(n<sup>3</sup>)

空间复杂度：O(n)

```
public class SolutionForRecursion {
    public static void main(String[] args) {
        int[] originArray = {0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5};
        System.out.println("input:" + Arrays.toString(originArray));
        System.out.println("-------      recursion        -------");
        println(recursion(originArray, 3));
    }

    private static void println(int[][] result) {
        System.out.println();
        System.out.println("-------      begin        -------");
        System.out.println("-------      count:" + result.length + "        -------");
        for (int i = 0; i < result.length; i++) {
            System.out.println((i + 1) + ":" + Arrays.toString(result[i]));
        }
        System.out.println("-------      end        -------");
    }

    /**
     * 3重for循环的递归版本
     *
     * @param originArray 原始数组
     * @param number      几个数相加？
     * @return 结果组合
     */
    private static int[][] recursion(int[] originArray, int number) {
        topLayer = number;
        resultArray = new int[number * 2][number];
        loop(originArray, new int[topLayer], 0, 0, number);
        if ((resultArray.length - currentOffset) > 0) {
            resultArray = trim(resultArray, currentOffset);
        }
        return resultArray;
    }

    private static int[][] resultArray = null;
    private static int currentOffset = 0;
    private static int topLayer = 0;

    private static Integer loop(int[] originArray, int[] chain, int beginIndex, int expectSumValue, int currentLayer) {
        Integer currentLayerLoopResult = null;
        for (int i = beginIndex; i < originArray.length; i++) {
            int currentValue = originArray[i];
            if (topLayer == currentLayer) {//最顶层loop时将结果链置空
                chain = new int[topLayer];
            } else {
                chain = copy(chain);
            }
            if (currentLayer > 0) {
                Integer nextLayerLoopResult;
                chain[topLayer - currentLayer] = currentValue;
                if (currentLayer == 1) {//最底层不需要再向下loop
                    nextLayerLoopResult = 0;
                } else {
                    nextLayerLoopResult = loop(originArray, chain, i + 1, expectSumValue - currentValue, currentLayer - 1);
                }
                int currentLayerSumValue = currentValue;
                if (nextLayerLoopResult == null) {
                    continue;
                } else {
                    currentLayerSumValue += nextLayerLoopResult;
                }
                if (currentLayerSumValue == expectSumValue) {
                    currentLayerLoopResult = currentValue;
                    if (currentLayer == 1) {
                        mergeArray(chain);
                        return currentLayerLoopResult;
                    }
                }
            } else {
                return currentLayerLoopResult;
            }
        }
        return currentLayerLoopResult;
    }

    private static int[] copy(int[] chain) {
        int[] result = new int[chain.length];
        System.arraycopy(chain, 0, result, 0, chain.length);
        return result;
    }

    private static void mergeArray(int[] chain) {
        if (currentOffset >= resultArray.length) {
            resultArray = resize(resultArray);
        }
        resultArray[currentOffset] = chain;
        currentOffset++;
    }

    private static int[][] trim(int[][] result, int index) {
        int[][] newResult = new int[index][result[0].length];
        System.arraycopy(result, 0, newResult, 0, newResult.length);
        return newResult;
    }

    private static int[][] resize(int[][] result) {
        int[][] newResult = new int[result.length + result[0].length][result[0].length];
        System.arraycopy(result, 0, newResult, 0, result.length);
        return newResult;
    }
}


以下是打印的结果：OK

input:[0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5]
-------      recursion        -------

-------      begin        -------
-------      count:13        -------
1:[0, 1, -1]
2:[0, 2, -2]
3:[0, 3, -3]
4:[0, 4, -4]
5:[0, 5, -5]
6:[1, 2, -3]
7:[1, 3, -4]
8:[1, 4, -5]
9:[2, 3, -5]
10:[3, -1, -2]
11:[4, -1, -3]
12:[5, -1, -4]
13:[5, -2, -3]
-------      end        -------

```

# 动态规划思想

动态规划(Dynamic Programming)的基本思想是：将待求解的问题分解成若干个相互联系的子问题，先求解子问题，然后从这些子问题的解得到原问题的解；对于重复出现的子问题，只在第一次遇到的时候对它进行求解，并把答案保存起来，让以后再次遇到时直接引用答案，不必重新求解。动态规划算法将问题的解决方案视为一系列决策的结果，与贪婪算法不同的是，在贪婪算法中，每采用一次贪婪准则，便做出一个不可撤回的决策；而在动态规划算法中，还要考察每个最优决策序列中是否包含一个最优决策子序列，即问题是否具有最优子结构性质。

下面贴出解法，假设数组长度为N，需要M个数相加为零。则时间复杂度为：`N*M`，空间复杂度为：`N*`M<sup>2</sup>。

```
public class SolutionForDynamicPrograming {
    public static void main(String[] args) {
        int[] originArray = {-1, 0, 1, 2, -1, -4};
        System.out.println("input:" + Arrays.toString(originArray));
        System.out.println("-------      dynamicPrograming        -------");
        int count = 3;//3个数相加
        int expectSumValue = 0;//期望累加值为零
        SolutionForDynamicPrograming solutionForDynamicPrograming = new SolutionForDynamicPrograming(count);
        solutionForDynamicPrograming.dynamicPrograming(originArray, 0, count, expectSumValue);
        solutionForDynamicPrograming.println(solutionForDynamicPrograming.toArray(solutionForDynamicPrograming.getSolution()));
    }

    private int count;
    private Set<String> uniques = new HashSet<>();
    private Map<Integer, Map<Integer, List<List<Integer>>>> existedSolution = new HashMap<>();
    private List<List<Integer>> solution = new ArrayList<>();

    public List<List<Integer>> getSolution() {
        return solution;
    }

    public SolutionForDynamicPrograming(int count) {
        this.count = count;
    }

    private int[][] toArray(List<List<Integer>> solution) {
        int[][] result = new int[solution.size()][count];
        int index = 0;
        for (List<Integer> list : solution) {
            result[index] = fromIntegerList(list);
            index++;
        }
        return result;
    }

    private int[] fromIntegerList(List<Integer> list) {
        Integer[] part = new Integer[count];
        part = list.toArray(part);
        int[] result = new int[count];
        for (int i = 0; i < part.length; i++) {
            result[i] = part[i];
        }
        return result;
    }

    private void println(int[][] result) {
        System.out.println();
        System.out.println("-------      begin        -------");
        System.out.println("-------      count:" + result.length + "        -------");
        for (int i = 0; i < result.length; i++) {
            System.out.println((i + 1) + ":" + Arrays.toString(result[i]));
        }
        System.out.println("-------      end        -------");
    }

    /**
     * 运用DP思想来降低递归次数
     */
    private List<List<Integer>> dynamicPrograming(int[] array, int beginIndex, int number, int expectValue) {
        if (number == 0 || beginIndex == array.length) {
            return null;
        }
        //尝试从已知的答案中获取
        List<List<Integer>> existed = getExistedSolution(number, expectValue);
        if (existed != null && !existed.isEmpty()) {
            //命中了，但有可能不符合beginIndex要求
            //校验命中项，是否符合要求
            List<List<Integer>> vailds = filterVailds(existed, array, beginIndex);
            if (vailds != null && !vailds.isEmpty()) {
                return vailds;
            }
        }
        List<List<Integer>> thisPartGroup = new ArrayList<>();
        for (int i = beginIndex; i < array.length; i++) {
            int currentValue = array[i];
            if (number == 1) {//最底层不再需要向下分解
                if (currentValue == expectValue) {
                    List<Integer> underlying = new ArrayList<>();
                    underlying.add(currentValue);
                    thisPartGroup.add(underlying);
                    break;
                }
            } else {
                //将问题分解为同性质的子问题
                List<List<Integer>> nextPartGroup = dynamicPrograming(array, i + 1, number - 1, expectValue - currentValue);
                if (nextPartGroup != null) {
                    buildFullGroups(thisPartGroup, nextPartGroup, currentValue);
                    if (number == count) {
                        //找到了多组可行的解法
                        solution.addAll(thisPartGroup);
                        thisPartGroup.clear();
                    }
                }
            }
        }
        if (number != count) {
            //如果不是最顶层，就将答案缓存起来
            putExistedSolution(number, expectValue, thisPartGroup);
        }
        if (thisPartGroup.isEmpty()) {
            thisPartGroup = null;
        }
        return thisPartGroup;
    }

    private List<List<Integer>> filterVailds(List<List<Integer>> existed, int[] array, int beginIndex) {
        List<List<Integer>> noRepeats = new ArrayList<>();
        for (List<Integer> list : existed) {
            boolean isOutOfRange = false;
            for (Integer key : list) {
                int index = Arrays.binarySearch(array, beginIndex, array.length - 1, key);
                if (index < beginIndex) {
                    isOutOfRange = true;
                    break;
                }
            }
            if (!isOutOfRange) {
                noRepeats.add(list);
            }
        }
        return noRepeats;
    }

    private void buildFullGroups(List<List<Integer>> thisPartGroup, List<List<Integer>> nextPartGroup, int currentValue) {
        for (List<Integer> list : nextPartGroup) {
            List<Integer> resultList = new ArrayList<>(list);
            resultList.add(currentValue);
            Collections.sort(resultList);
            if (uniques.add(resultList.toString())) {
                thisPartGroup.add(resultList);
            }
        }
    }

    private void putExistedSolution(int number, int expectValue, List<List<Integer>> result) {
        Map<Integer, List<List<Integer>>> expects = new HashMap<>();
        if (existedSolution.containsKey(number)) {
            expects = existedSolution.get(number);
        }
        expects.put(expectValue, result);
        existedSolution.put(number, expects);
    }

    private List<List<Integer>> getExistedSolution(int number, int expectValue) {
        if (existedSolution.containsKey(number)) {
            Map<Integer, List<List<Integer>>> expects = existedSolution.get(number);
            if (expects.containsKey(expectValue)) {
                return expects.get(expectValue);
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
}


以下是打印的结果：OK

input:[0, 1, 2, 3, 4, 5, -1, -2, -3, -4, -5]
-------      dynamicPrograming        -------

-------      begin        -------
-------      count:13        -------
1:[-1, 1, 0]
2:[-2, 2, 0]
3:[-3, 3, 0]
4:[-4, 4, 0]
5:[-5, 5, 0]
6:[-3, 2, 1]
7:[-4, 3, 1]
8:[-5, 4, 1]
9:[-5, 3, 2]
10:[-2, -1, 3]
11:[-3, -1, 4]
12:[-4, -1, 5]
13:[-3, -2, 5]
-------      end        -------

```

尝试优化解法的过程中，让我获益良多，尤其是对于动态规划思想理解的更深刻。在对动态规划解法的研究中，遇到了二维数组去重复的问题，例如二维数组：[[1,-1,0],[0,-1,1]]，这是重复的两个组合，需要去除重复，当时还想到了利用先挨个排好序，再用KMP算法（更简单的利用字符串来equals）来做模式匹配，后来想到了一个巧妙的解法，用beginIndex值来进行判定（filterVailds）就可以了。