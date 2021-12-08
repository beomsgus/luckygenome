
package com.luckygenome.luckygenome.controller;

import com.luckygenome.luckygenome.dto.ResponseDTO;
import com.luckygenome.luckygenome.service.IndexService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.ModelAndView;

@RestController
public class IndexController {
	@Autowired
	IndexService indexService;
	
    @RequestMapping(value = "/", method = RequestMethod.GET)
    public ModelAndView  index() {
    	ModelAndView modelAndView = new ModelAndView("index");
    	return modelAndView;
    }
    @RequestMapping(value = "/findAll", method = RequestMethod.POST)
    public ResponseEntity<?> findAll() {
        ResponseDTO responseDTO = new ResponseDTO();
        responseDTO.setResultCode("S0001");
        responseDTO.setRes(indexService.findAll());
        return new ResponseEntity<>(responseDTO, HttpStatus.OK);
    }
}
